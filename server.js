#!/usr/bin/env node

// Primary deployment server for Replit and cloud platforms
// Addresses the "connection refused" error by ensuring proper port binding

const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const PORT = parseInt(process.env.PORT) || 8000;
const HOST = '0.0.0.0';

// Set environment variables
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.tzwzmzakxgatyvhvngez:Xentrika2025!@aws-0-eu-west-3.pooler.supabase.com:6543/postgres';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6d3ptemFreGdhdHl2aHZuZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzODUwOTAsImV4cCI6MjA2NTk2MTA5MH0.623RCZAPWUGJlQgsfYRXS3E6riACjb2MLJACOZ2gHPc';

let dbClient = null;

async function connectDatabase() {
  try {
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    
    await dbClient.connect();
    console.log('Database connected');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoints - critical for deployment
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Centrika Neobank API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    port: PORT,
    host: HOST,
    database: dbClient ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbClient ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// User registration endpoint
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
        message: 'Service temporarily unavailable'
      });
    }
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userResult = await dbClient.query(
      'INSERT INTO users (first_name, last_name, phone, email, password_hash, kyc_status, is_active, preferred_language) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [firstName, lastName, phone, `${phone}@centrika.rw`, hashedPassword, 'pending', true, 'en']
    );
    
    const user = userResult.rows[0];
    
    // Create wallet
    await dbClient.query(
      'INSERT INTO wallets (user_id, balance, currency, is_active, kyc_level) VALUES ($1, $2, $3, $4, $5)',
      [user.id, '1000.00', 'RWF', true, 1]
    );
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { userId: user.id }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') {
      res.status(409).json({
        success: false,
        message: 'Phone number already registered'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  }
});

// User login endpoint
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
        message: 'Service temporarily unavailable'
      });
    }
    
    const result = await dbClient.query(
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
      process.env.JWT_SECRET,
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

// Admin endpoints
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (email === 'admin@centrika.rw' && password === 'password') {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: 1, email: email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        data: {
          token,
          user: { id: 1, email: email, role: 'admin' }
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

app.get('/api/admin/metrics', async (req, res) => {
  try {
    if (!dbClient) {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable'
      });
    }
    
    const [usersResult, walletsResult, transactionsResult] = await Promise.all([
      dbClient.query('SELECT COUNT(*) as total FROM users'),
      dbClient.query('SELECT SUM(CAST(balance as DECIMAL)) as total_balance, COUNT(*) as active_wallets FROM wallets WHERE is_active = true'),
      dbClient.query('SELECT COUNT(*) as total_transactions FROM transactions')
    ]);
    
    const metrics = {
      dailySignups: parseInt(usersResult.rows[0].total) || 0,
      successfulKYCRate: 0,
      transactionCount: parseInt(transactionsResult.rows[0].total_transactions) || 0,
      totalLedgerBalance: parseFloat(walletsResult.rows[0].total_balance) || 0,
      activeUsers: parseInt(walletsResult.rows[0].active_wallets) || 0,
    };
    
    res.json({
      success: true,
      data: metrics
    });
    
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server function
async function startServer() {
  console.log('Starting Centrika Banking Server');
  console.log(`Node.js version: ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Host: ${HOST}`);
  console.log(`Port: ${PORT}`);
  
  // Start HTTP server first - this is critical for deployment
  const server = app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check available at: http://${HOST}:${PORT}/health`);
    console.log('Server started successfully - ready for connections');
  });
  
  // Connect to database in background
  connectDatabase().then(connected => {
    console.log(`Database connection: ${connected ? 'successful' : 'failed'}`);
  }).catch(error => {
    console.error('Database connection error:', error.message);
  });
  
  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    
    server.close(() => {
      console.log('HTTP server closed');
      
      if (dbClient) {
        dbClient.end().then(() => {
          console.log('Database connection closed');
          process.exit(0);
        }).catch(() => {
          process.exit(1);
        });
      } else {
        process.exit(0);
      }
    });
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  return server;
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server if this file is run directly
if (require.main === module) {
  startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = { app, startServer };