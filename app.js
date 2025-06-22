#!/usr/bin/env node

// Primary deployment entry point for Replit and cloud platforms
// Ensures server starts on port 8000 with proper binding

const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = '0.0.0.0'; // Essential for deployment - never use localhost

// Environment configuration
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.tzwzmzakxgatyvhvngez:Xentrika2025!@aws-0-eu-west-3.pooler.supabase.com:6543/postgres';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6d3ptemFreGdhdHl2aHZuZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzODUwOTAsImV4cCI6MjA2NTk2MTA5MH0.623RCZAPWUGJlQgsfYRXS3E6riACjb2MLJACOZ2gHPc';

// Database client
let dbClient = null;

async function connectDB() {
  try {
    console.log('Connecting to database...');
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    
    await dbClient.connect();
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    dbClient = null;
    return false;
  }
}

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Essential endpoints for deployment health checks
app.get('/', (req, res) => {
  res.json({
    service: 'Centrika Neobank API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    port: PORT,
    host: HOST,
    database: dbClient ? 'connected' : 'disconnected'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbClient ? 'connected' : 'disconnected',
    port: PORT
  });
});

// Banking API endpoints
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
      return res.status(500).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await dbClient.query(
      'INSERT INTO users (first_name, last_name, phone, email, password_hash, kyc_status, is_active, preferred_language) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [firstName, lastName, phone, `${phone}@centrika.rw`, hashedPassword, 'pending', true, 'en']
    );
    
    const user = result.rows[0];
    
    // Create wallet for user
    await dbClient.query(
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
      return res.status(500).json({
        success: false,
        message: 'Database connection unavailable'
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

// Start server function
async function startServer() {
  console.log('Starting Centrika Banking API Server');
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Host: ${HOST}`);
  console.log(`Port: ${PORT}`);
  
  // Start server immediately
  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log('Health check endpoint: /health');
    console.log('API endpoints: /api/auth/register, /api/auth/login');
  });
  
  // Connect database in background
  connectDB().then(connected => {
    console.log(`Database status: ${connected ? 'Connected' : 'Disconnected'}`);
  }).catch(error => {
    console.error('Database connection error:', error.message);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down server...');
    if (dbClient) {
      await dbClient.end();
    }
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
  
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

// Start the server
if (require.main === module) {
  startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = { app, startServer };