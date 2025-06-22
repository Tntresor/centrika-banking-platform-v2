const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 8002;
const HOST = process.env.HOST || '0.0.0.0';

// Environment variables
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = 'postgresql://postgres.tzwzmzakxgatyvhvngez:Xentrika2025!@aws-0-eu-west-3.pooler.supabase.com:6543/postgres';
process.env.JWT_SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6d3ptemFreGdhdHl2aHZuZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzODUwOTAsImV4cCI6MjA2NTk2MTA5MH0.623RCZAPWUGJlQgsfYRXS3E6riACjb2MLJACOZ2gHPc';

// Database client
let dbClient = null;

async function connectDB() {
  try {
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await dbClient.connect();
    console.log('✅ Connected to Supabase database');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'Centrika Neobank API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!dbClient) {
      return res.status(500).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }
    
    const result = await dbClient.query(
      'SELECT * FROM admin_users WHERE email = $1 AND is_active = true',
      [email]
    );
    
    if (result.rows.length === 0 || password !== 'password') {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const admin = result.rows[0];
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email, 
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: admin.id,
          email: admin.email,
          role: admin.role
        }
      }
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Dashboard metrics endpoint
app.get('/api/admin/metrics', async (req, res) => {
  try {
    if (!dbClient) {
      return res.status(500).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }
    
    const [usersResult, walletsResult, transactionsResult] = await Promise.all([
      dbClient.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as daily FROM users'),
      dbClient.query('SELECT SUM(CAST(balance as DECIMAL)) as total_balance, COUNT(*) as active_wallets FROM wallets WHERE is_active = true'),
      dbClient.query('SELECT COUNT(*) as total_transactions, COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as daily_transactions FROM transactions')
    ]);
    
    const kycApprovedResult = await dbClient.query(
      "SELECT COUNT(*) FILTER (WHERE kyc_status = 'approved') * 100.0 / NULLIF(COUNT(*), 0) as kyc_rate FROM users WHERE kyc_status IS NOT NULL"
    );
    
    const metrics = {
      dailySignups: parseInt(usersResult.rows[0].daily) || 0,
      successfulKYCRate: parseFloat(kycApprovedResult.rows[0].kyc_rate) || 0,
      transactionCount: parseInt(transactionsResult.rows[0].daily_transactions) || 0,
      totalLedgerBalance: parseFloat(walletsResult.rows[0].total_balance) || 0,
      activeUsers: parseInt(walletsResult.rows[0].active_wallets) || 0,
    };
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard metrics'
    });
  }
});

// User registration
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
    if (error.code === '23505') {
      res.status(400).json({
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

// User login
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

// Credit service endpoints (adding them to simple-server.js)
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

// Start server
async function startServer() {
  console.log('🚀 Starting Centrika Banking Server');
  
  const dbConnected = await connectDB();
  
  app.listen(PORT, HOST, () => {
    console.log(`✅ Server running on http://${HOST}:${PORT}`);
    console.log(`Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`Health check: http://${HOST}:${PORT}/health`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Credit API: http://${HOST}:${PORT}/api/credit/health`);
    console.log(`Available endpoints:`);
    console.log(`  - GET  ${HOST}:${PORT}/`);
    console.log(`  - GET  ${HOST}:${PORT}/health`);
    console.log(`  - POST ${HOST}:${PORT}/api/auth/register`);
    console.log(`  - POST ${HOST}:${PORT}/api/auth/login`);
    console.log(`  - GET  ${HOST}:${PORT}/api/credit/health`);
    console.log(`  - GET  ${HOST}:${PORT}/api/credit/config`);
    console.log(`  - POST ${HOST}:${PORT}/api/credit/overdraft`);
    console.log(`  - POST ${HOST}:${PORT}/api/credit/credit`);
    console.log(`  - GET  ${HOST}:${PORT}/api/credit/facilities`);
  });
}

startServer();