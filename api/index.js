// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('../server/routes/auth-simple');
const kycRoutes = require('../server/routes/kyc-simple');
const transactionRoutes = require('../server/routes/transactions-simple');
const cardRoutes = require('../server/routes/cards-simple');
const momoRoutes = require('../server/routes/momo-simple');
const adminRoutes = require('../server/routes/admin-simple');

// Import services
const NotificationService = require('../server/services/NotificationService');

const app = express();

// Health check endpoints
app.get('/', (req, res) => {
  res.json({
    service: 'Centrika Neobank API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    platform: 'Vercel'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: 'Vercel'
  });
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  credentials: true,
}));

// Rate limiting (more lenient for serverless)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for serverless
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (simplified for serverless)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/momo', momoRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors,
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Initialize services (async for serverless)
let servicesInitialized = false;
async function initializeServices() {
  if (!servicesInitialized) {
    try {
      await NotificationService.initialize();
      servicesInitialized = true;
      console.log('Services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
  }
}

// Middleware to ensure services are initialized
app.use(async (req, res, next) => {
  await initializeServices();
  next();
});

// Export for Vercel
module.exports = app;