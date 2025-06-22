#!/usr/bin/env node

// Deployment server - specifically addresses Replit "connection refused" error
// Ensures proper port binding and immediate server startup

const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const PORT = parseInt(process.env.PORT) || 8000;
const HOST = '0.0.0.0'; // Critical - never use localhost for deployment

// Environment setup
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.tzwzmzakxgatyvhvngez:Xentrika2025!@aws-0-eu-west-3.pooler.supabase.com:6543/postgres';

let dbClient = null;
let isReconnecting = false;

// Enhanced database connection with auto-reconnect
async function initializeDatabase() {
  try {
    // Clean up existing connection
    if (dbClient) {
      try {
        await dbClient.end();
      } catch (e) {
        // Ignore cleanup errors
      }
      dbClient = null;
    }

    dbClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    
    // Handle connection errors and reconnection
    dbClient.on('error', async (err) => {
      console.error('Database connection error:', err.message);
      if (!isReconnecting) {
        isReconnecting = true;
        console.log('Attempting to reconnect to database...');
        setTimeout(async () => {
          await initializeDatabase();
          isReconnecting = false;
        }, 5000);
      }
    });

    dbClient.on('end', () => {
      console.log('Database connection ended');
      dbClient = null;
    });
    
    const connectionPromise = dbClient.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 10000)
    );
    
    await Promise.race([connectionPromise, timeoutPromise]);
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database failed to connect:', error.message);
    dbClient = null;
    return false;
  }
}

// Database query wrapper with retry logic
async function executeQuery(query, params = []) {
  if (!dbClient) {
    throw new Error('Database not connected');
  }
  
  try {
    return await dbClient.query(query, params);
  } catch (error) {
    if (error.code === '57P01' || error.code === 'ECONNRESET') {
      console.log('Connection lost, attempting to reconnect...');
      await initializeDatabase();
      if (dbClient) {
        return await dbClient.query(query, params);
      }
    }
    throw error;
  }
}

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Root endpoint - critical for deployment health checks
app.get('/', (req, res) => {
  res.json({
    service: 'Centrika Neobank API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    port: PORT,
    database: dbClient ? 'connected' : 'disconnected'
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbClient ? 'connected' : 'disconnected'
  });
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, phone, password } = req.body;
    
    if (!firstName || !lastName || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    if (!dbClient) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await executeQuery(
      'INSERT INTO users (first_name, last_name, phone, email, password_hash, kyc_status, is_active, preferred_language) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [firstName, lastName, phone, `${phone}@centrika.rw`, hashedPassword, 'pending', true, 'en']
    );
    
    const user = result.rows[0];
    
    await executeQuery(
      'INSERT INTO wallets (user_id, balance, currency, is_active, kyc_level) VALUES ($1, $2, $3, $4, $5)',
      [user.id, '1000.00', 'RWF', true, 1]
    );
    
    res.json({
      success: true,
      message: 'Account created successfully',
      data: { userId: user.id }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password are required'
      });
    }
    
    if (!dbClient) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }
    
    const result = await executeQuery(
      'SELECT * FROM users WHERE phone = $1 AND is_active = true',
      [phone]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const user = result.rows[0];
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'  
      });
    }
    
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone
        }
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Start server immediately - this is the key fix for deployment
function startServer() {
  console.log('Starting Centrika Banking Server for deployment');
  console.log(`Host: ${HOST}`);
  console.log(`Port: ${PORT}`);
  
  // Start HTTP server first - critical for avoiding "connection refused"
  const server = app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Deployment health check ready');
  });
  
  // Initialize database in background
  setTimeout(() => {
    initializeDatabase().then(connected => {
      console.log(`Database: ${connected ? 'connected' : 'failed'}`);
    });
  }, 100);
  
  return server;
}

// Enhanced error handling and graceful shutdown
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  console.log('Server continuing to operate...');
  // Don't exit - let the server continue running
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  console.log('Server continuing to operate...');
  // Don't exit - let the server continue running
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (dbClient) {
    try {
      await dbClient.end();
      console.log('Database connection closed');
    } catch (e) {
      console.error('Error closing database:', e.message);
    }
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  if (dbClient) {
    try {
      await dbClient.end();
      console.log('Database connection closed');
    } catch (e) {
      console.error('Error closing database:', e.message);
    }
  }
  process.exit(0);
});

// Start the server
startServer();