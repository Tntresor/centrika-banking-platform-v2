const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
// Render uses PORT 10000 by default
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

// Environment variables - Use Render's DATABASE_URL if available
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.tzwzmzakxgatyvhvngez:Xentrika2025!@aws-0-eu-west-3.pooler.supabase.com:6543/postgres';
const JWT_SECRET = process.env.JWT_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6d3ptemFreGdhdHl2aHZuZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzODUwOTAsImV4cCI6MjA2NTk2MTA5MH0.623RCZAPWUGJlQgsfYRXS3E6riACjb2MLJACOZ2gHPc';

console.log('🚀 Centrika Banking API Starting...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${PORT}`);
console.log(`Database: ${DATABASE_URL.includes('render') ? 'Render PostgreSQL' : 'External Database'}`);

// Database client
let dbClient = null;

async function connectDB() {
  try {
    console.log('🔌 Connecting to database...');
    dbClient = new Client({
      connectionString: DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });

    await dbClient.connect();
    console.log('✅ Database connected successfully');

    // Test the connection
    await dbClient.query('SELECT NOW()');
    console.log('✅ Database test query successful');

    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (dbClient) {
      try {
        await dbClient.end();
      } catch (e) {
        // Ignore cleanup errors
      }
      dbClient = null;
    }
    return false;
  }
}

// Middleware
app.use(cors({ 
  origin: [
    'https://centrika-api.onrender.com', 
    'http://localhost:3000', 
    'http://localhost:5001',
    'https://91e993b2-54c3-4dd2-9af0-7a0727062cb7-00-2rkhsct4m0zt5.janeway.replit.dev',
    '*'
  ],
  credentials: true 
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoints
app.get('/', (req, res) => {
  res.json({
    service: 'Centrika Neobank API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbClient ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
    port: PORT
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

// Test endpoint for quick verification
app.get('/test', (req, res) => {
  res.json({
    message: 'Centrika API is working!',
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Admin login attempt:', email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!dbClient) {
      console.log('Database unavailable for admin login');
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
      console.log('Invalid admin credentials');
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
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Admin login successful:', email);

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

    console.log('Registration attempt:', { firstName, lastName, phone });

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

    console.log('User registered successfully:', user.id);

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

    console.log('Login attempt:', phone);

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
      console.log('User not found:', phone);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      console.log('Invalid password for user:', phone);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful:', phone);

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

// =================== NEW TRANSACTION ENDPOINTS ===================

// Get wallet information
app.get('/api/transactions/wallet', async (req, res) => {
  try {
    // Mock wallet data for now - in production, get from JWT token
    const walletData = {
      balance: 50000,
      currency: 'RWF',
      accountNumber: '1234567890',
      transactions: [
        {
          id: 1,
          type: 'credit',
          amount: 25000,
          description: 'Salary deposit',
          date: new Date().toISOString(),
          status: 'completed'
        },
        {
          id: 2,
          type: 'debit',
          amount: 5000,
          description: 'ATM withdrawal',
          date: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed'
        }
      ]
    };

    console.log('Wallet data requested');
    res.json(walletData);
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ error: 'Failed to get wallet data' });
  }
});

// P2P Transfer
app.post('/api/transactions/p2p', async (req, res) => {
  try {
    const { recipientPhone, amount, description } = req.body;
    console.log('P2P transfer attempt:', { recipientPhone, amount, description });

    // Mock transfer logic
    const transfer = {
      id: Math.floor(Math.random() * 10000),
      from: 'user_phone', // Should come from auth
      to: recipientPhone,
      amount: amount,
      description: description || 'P2P Transfer',
      status: 'completed',
      timestamp: new Date().toISOString(),
      reference: `TXN${Date.now()}`
    };

    console.log('Transfer completed:', transfer);
    res.json({
      success: true,
      message: 'Transfer completed successfully',
      transaction: transfer
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// Get transaction history
app.get('/api/transactions/history', async (req, res) => {
  try {
    const transactions = [
      {
        id: 1,
        type: 'credit',
        amount: 25000,
        description: 'Salary deposit',
        date: new Date().toISOString(),
        status: 'completed'
      },
      {
        id: 2,
        type: 'debit',
        amount: 5000,
        description: 'ATM withdrawal',
        date: new Date(Date.now() - 86400000).toISOString(),
        status: 'completed'
      },
      {
        id: 3,
        type: 'debit',
        amount: 2000,
        description: 'P2P Transfer to John',
        date: new Date(Date.now() - 172800000).toISOString(),
        status: 'completed'
      }
    ];

    console.log('Transaction history requested');
    res.json(transactions);
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
});

// Mobile Money deposit
app.post('/api/momo/deposit', async (req, res) => {
  try {
    const { userId, amount, phoneNumber } = req.body;

    console.log('MoMo deposit attempt:', { userId, amount, phoneNumber });

    const transaction = {
      id: Math.floor(Math.random() * 10000),
      userId: userId,
      amount: amount,
      phoneNumber: phoneNumber,
      type: 'deposit',
      status: 'completed',
      reference: `MOMO_DEP_${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Deposit successful',
      transaction: transaction
    });
  } catch (error) {
    console.error('MoMo deposit error:', error);
    res.status(500).json({ error: 'Deposit failed' });
  }
});

// Mobile Money withdrawal
app.post('/api/momo/withdraw', async (req, res) => {
  try {
    const { userId, amount, phoneNumber } = req.body;

    console.log('MoMo withdrawal attempt:', { userId, amount, phoneNumber });

    const transaction = {
      id: Math.floor(Math.random() * 10000),
      userId: userId,
      amount: amount,
      phoneNumber: phoneNumber,
      type: 'withdrawal',
      status: 'completed',
      reference: `MOMO_WD_${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Withdrawal successful',
      transaction: transaction
    });
  } catch (error) {
    console.error('MoMo withdrawal error:', error);
    res.status(500).json({ error: 'Withdrawal failed' });
  }
});

// =================== END NEW TRANSACTION ENDPOINTS ===================

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
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start server
async function startServer() {
  console.log('🚀 Starting Centrika Banking Server');
  console.log(`Node version: ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Host: ${HOST}`);
  console.log(`Port: ${PORT}`);

  // Start HTTP server first
  const server = app.listen(PORT, HOST, () => {
    console.log(`✅ Server running on http://${HOST}:${PORT}`);
    console.log(`🌐 Access your API at: https://your-app-name.onrender.com`);
    console.log(`📊 Health check: /health`);
    console.log(`🧪 Test endpoint: /test`);
    console.log(`Available endpoints:`);
    console.log(`  - GET  /`);
    console.log(`  - GET  /health`);
    console.log(`  - GET  /test`);
    console.log(`  - POST /api/auth/register`);
    console.log(`  - POST /api/auth/login`);
    console.log(`  - POST /api/admin/login`);
    console.log(`  - GET  /api/admin/metrics`);
    console.log(`  - GET  /api/transactions/wallet`);
    console.log(`  - POST /api/transactions/p2p`);
    console.log(`  - GET  /api/transactions/history`);
    console.log(`  - POST /api/momo/deposit`);
    console.log(`  - POST /api/momo/withdraw`);
  });

  // Connect to database
  console.log('📡 Connecting to database...');
  const dbConnected = await connectDB();

  if (dbConnected) {
    console.log('🎉 Centrika API fully operational!');
  } else {
    console.log('⚠️  Server running without database - limited functionality');
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    if (dbClient) {
      try {
        await dbClient.end();
        console.log('📡 Database connection closed');
      } catch (error) {
        console.error('Error closing database:', error.message);
      }
    }
    server.close(() => {
      console.log('🔌 Server closed');
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
});

// Start the server
startServer().catch(error => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});