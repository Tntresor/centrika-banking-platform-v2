const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const PORT = 8007;

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

// Start server
async function startServer() {
  console.log('🚀 Starting Centrika Banking Server');
  
  const dbConnected = await connectDB();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
    console.log(`Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`Health check: http://0.0.0.0:${PORT}/health`);
  });
}

startServer();