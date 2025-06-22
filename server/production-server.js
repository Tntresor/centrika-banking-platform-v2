#!/usr/bin/env node

// Production-optimized server for deployment
const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Enhanced environment configuration for deployment
console.log('🚀 Starting Centrika Banking Server (Production)');
console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`Host: ${HOST}`);
console.log(`Port: ${PORT}`);
console.log(`Database URL configured: ${!!process.env.DATABASE_URL}`);

// Database configuration with enhanced SSL settings for deployment
const databaseConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Xentrika2025!@db.tzwzmzakxgatyvhvngez.supabase.co:5432/postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
};

let dbClient = null;

async function connectDB() {
  try {
    dbClient = new Client(databaseConfig);
    await dbClient.connect();
    
    // Handle connection errors during runtime
    dbClient.on('error', (error) => {
      console.error('Database connection error:', error.message);
      if (error.code === '57P01') {
        console.log('Database connection terminated, will reconnect if needed');
        dbClient = null;
      }
    });
    
    console.log('✅ Connected to Supabase database');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    // Continue without database for basic functionality
    return false;
  }
}

// Enhanced CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://*.replit.app', 'https://*.replit.dev', process.env.FRONTEND_URL]
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoints
app.get('/', (req, res) => {
  res.json({
    service: 'Centrika Neobank API',
    status: 'running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbClient ? 'connected' : 'disconnected'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: dbClient ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// Credit service endpoints with enhanced error handling
app.get('/api/credit/health', (req, res) => {
  res.json({
    success: true,
    message: 'Credit service is healthy',
    data: {
      service: 'credit-service',
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      configVersion: '1.2.4',
      timestamp: new Date().toISOString(),
      database: dbClient ? 'connected' : 'disconnected'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/credit/config', (req, res) => {
  const publicConfig = {
    overdraft: {
      maxAmount: 1500000,
      purposeMaxLength: 250,
      purposeRequired: true
    },
    credit: {
      maxAmount: 6000000,
      minTermMonths: 3,
      maxTermMonths: 18,
      purposeMaxLength: 500
    },
    repayment: {
      allowedPaymentMethods: ["bank_transfer", "card", "wallet", "crypto"]
    }
  };
  
  res.json({
    success: true,
    message: 'Configuration retrieved successfully',
    data: publicConfig,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/credit/overdraft', async (req, res) => {
  try {
    const { amount, purpose } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
        timestamp: new Date().toISOString()
      });
    }
    
    if (amount > 1500000) {
      return res.status(400).json({
        success: false,
        message: 'Amount exceeds maximum limit of 1,500,000 RWF',
        timestamp: new Date().toISOString()
      });
    }
    
    const result = {
      facilityId: Math.floor(Math.random() * 100000),
      amount: amount,
      purpose: purpose || 'Emergency fund',
      status: 'approved',
      interestRate: 0.05,
      termDays: 30,
      approvedAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      message: 'Overdraft facility approved',
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Overdraft error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process overdraft request',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/credit/credit', async (req, res) => {
  try {
    const { amount, termMonths, purpose } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!termMonths || termMonths < 3 || termMonths > 18) {
      return res.status(400).json({
        success: false,
        message: 'Term must be between 3 and 18 months',
        timestamp: new Date().toISOString()
      });
    }
    
    if (amount > 6000000) {
      return res.status(400).json({
        success: false,
        message: 'Amount exceeds maximum limit of 6,000,000 RWF',
        timestamp: new Date().toISOString()
      });
    }
    
    const interestRates = { 3: 0.15, 6: 0.16, 9: 0.17, 12: 0.18, 18: 0.20 };
    const interestRate = interestRates[termMonths] || 0.18;
    
    const result = {
      applicationId: Math.floor(Math.random() * 100000),
      amount: amount,
      termMonths: termMonths,
      purpose: purpose,
      status: 'pending',
      interestRate: interestRate,
      monthlyPayment: Math.round((amount * (1 + interestRate * (termMonths / 12))) / termMonths),
      submittedAt: new Date().toISOString(),
      expectedDecision: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    res.status(201).json({
      success: true,
      message: 'Credit application submitted successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Credit application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process credit application',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/credit/facilities', (req, res) => {
  const facilities = [
    {
      id: 1,
      type: 'overdraft',
      amount: 50000,
      status: 'active',
      used: 0,
      available: 50000,
      interestRate: 0.05,
      createdAt: '2025-06-20T10:00:00.000Z'
    },
    {
      id: 2,
      type: 'credit',
      amount: 500000,
      status: 'pending',
      termMonths: 12,
      interestRate: 0.18,
      monthlyPayment: 45833,
      createdAt: '2025-06-22T07:00:00.000Z'
    }
  ];
  
  res.json({
    success: true,
    message: 'Credit facilities retrieved successfully',
    data: {
      facilities: facilities,
      total: facilities.length,
      page: 1,
      limit: 10
    },
    timestamp: new Date().toISOString()
  });
});

// Authentication endpoints for basic functionality
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, phone, password } = req.body;
    
    if (!firstName || !lastName || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    // Mock registration for demonstration
    const user = {
      id: Math.floor(Math.random() * 100000),
      firstName,
      lastName,
      phone,
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user }
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
    
    // Mock authentication for demonstration
    const user = {
      id: 12345,
      firstName: 'Demo',
      lastName: 'User',
      phone: phone,
      email: 'demo@centrika.rw'
    };
    
    const token = Buffer.from(JSON.stringify(user)).toString('base64');
    
    res.json({
      success: true,
      data: {
        token,
        user
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    requestedUrl: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Enhanced graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  try {
    if (dbClient) {
      await dbClient.end();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  try {
    if (dbClient) {
      await dbClient.end();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});

// Handle database connection errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  if (error.code === '57P01') {
    console.log('Database connection terminated by administrator, continuing with limited functionality');
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Start server with enhanced error handling
async function startServer() {
  try {
    const dbConnected = await connectDB();
    
    const server = app.listen(PORT, HOST, () => {
      console.log(`✅ Server running on http://${HOST}:${PORT}`);
      console.log(`Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log(`Health check: http://${HOST}:${PORT}/health`);
      console.log(`Credit API: http://${HOST}:${PORT}/api/credit/health`);
      console.log('🎉 Centrika Banking Server is ready for deployment!');
    });
    
    server.on('error', (error) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please use a different port.`);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();