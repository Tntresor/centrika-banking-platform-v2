const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { neon } = require('@neondatabase/serverless');

const app = express();
const PORT = process.env.PORT || 8000;

// Database connection
const sql = neon(process.env.DATABASE_URL);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Centrika Banking API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    database: process.env.DATABASE_URL ? 'connected' : 'not configured',
    timestamp: new Date().toISOString()
  });
});

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await sql`
      INSERT INTO users (first_name, last_name, phone, email, password_hash, status)
      VALUES (${firstName}, ${lastName}, ${phone}, ${email}, ${hashedPassword}, 'active')
      RETURNING id, first_name, last_name, phone, email, status, created_at
    `;
    
    const user = result[0];
    
    // Create wallet
    await sql`
      INSERT INTO wallets (user_id, balance, currency, status)
      VALUES (${user.id}, '0.00', 'RWF', 'active')
    `;
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      process.env.JWT_SECRET || 'default-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        email: user.email,
        status: user.status
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    const result = await sql`
      SELECT id, first_name, last_name, phone, email, password_hash, status
      FROM users 
      WHERE phone = ${phone}
    `;
    
    if (result.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      process.env.JWT_SECRET || 'default-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        email: user.email,
        status: user.status
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Wallet endpoints
app.get('/api/wallet', authenticateToken, async (req, res) => {
  try {
    const result = await sql`
      SELECT w.*, u.first_name, u.last_name
      FROM wallets w
      JOIN users u ON w.user_id = u.id
      WHERE w.user_id = ${req.user.userId}
    `;
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    const wallet = result[0];
    res.json({
      success: true,
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        currency: wallet.currency,
        status: wallet.status,
        owner: {
          firstName: wallet.first_name,
          lastName: wallet.last_name
        }
      }
    });
  } catch (error) {
    console.error('Wallet fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// Transaction endpoints
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await sql`
      SELECT t.*, w.user_id
      FROM transactions t
      JOIN wallets w ON t.wallet_id = w.id
      WHERE w.user_id = ${req.user.userId}
      ORDER BY t.created_at DESC
      LIMIT 50
    `;
    
    res.json({
      success: true,
      transactions: result.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        description: t.description,
        status: t.status,
        reference: t.reference,
        createdAt: t.created_at
      }))
    });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// P2P Transfer
app.post('/api/transfer', authenticateToken, async (req, res) => {
  try {
    const { recipientPhone, amount, description } = req.body;
    
    // Find recipient
    const recipientResult = await sql`
      SELECT u.id, w.id as wallet_id
      FROM users u
      JOIN wallets w ON u.id = w.user_id
      WHERE u.phone = ${recipientPhone}
    `;
    
    if (recipientResult.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    
    // Get sender wallet
    const senderResult = await sql`
      SELECT id, balance FROM wallets WHERE user_id = ${req.user.userId}
    `;
    
    const senderWallet = senderResult[0];
    const recipientWallet = recipientResult[0];
    
    // Check balance
    if (parseFloat(senderWallet.balance) < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Create transactions
    const reference = `TXN${Date.now()}`;
    
    // Debit sender
    await sql`
      INSERT INTO transactions (wallet_id, type, amount, currency, description, status, reference)
      VALUES (${senderWallet.id}, 'debit', ${amount}, 'RWF', ${description || 'P2P Transfer'}, 'completed', ${reference})
    `;
    
    // Credit recipient
    await sql`
      INSERT INTO transactions (wallet_id, type, amount, currency, description, status, reference)
      VALUES (${recipientWallet.wallet_id}, 'credit', ${amount}, 'RWF', ${description || 'P2P Transfer Received'}, 'completed', ${reference})
    `;
    
    // Update balances
    await sql`
      UPDATE wallets 
      SET balance = (balance::numeric - ${amount}::numeric)::text
      WHERE id = ${senderWallet.id}
    `;
    
    await sql`
      UPDATE wallets 
      SET balance = (balance::numeric + ${amount}::numeric)::text
      WHERE id = ${recipientWallet.wallet_id}
    `;
    
    res.json({
      success: true,
      message: 'Transfer completed successfully',
      reference
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// For Vercel serverless
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`Centrika Banking API running on port ${PORT}`);
  });
}