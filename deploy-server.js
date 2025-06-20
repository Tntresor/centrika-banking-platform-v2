#!/usr/bin/env node

// Deployment entry point for Centrika Neobank
// This script handles the complete deployment startup process

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

console.log('🚀 Starting Centrika Neobank deployment...');

// Set production environment
process.env.NODE_ENV = 'production';
const PORT = process.env.PORT || 8000;

console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${PORT}`);
console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Create Express app
const app = express();

// Health check endpoint - must be first, before any middleware
app.get('/', (req, res) => {
  res.json({
    service: 'Centrika Neobank API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: PORT
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Load and mount routes from server directory
try {
  const authRoutes = require('./server/routes/auth-simple');
  const kycRoutes = require('./server/routes/kyc-simple');
  const transactionRoutes = require('./server/routes/transactions-simple');
  const cardRoutes = require('./server/routes/cards-simple');
  const momoRoutes = require('./server/routes/momo-simple');
  const adminRoutes = require('./server/routes/admin-simple');

  // Mount routes
  app.use('/api/auth', authRoutes);
  app.use('/api/kyc', kycRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/cards', cardRoutes);
  app.use('/api/momo', momoRoutes);
  app.use('/api/admin', adminRoutes);

  console.log('Routes loaded successfully');
} catch (error) {
  console.error('Error loading routes:', error);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors,
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Initialize services
async function initializeServices() {
  try {
    // Try to initialize notification service
    const NotificationService = require('./server/services/NotificationService');
    await NotificationService.initialize();
    console.log('Services initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize services:', error.message);
    console.log('Running in demo mode without push notifications');
  }
}

// Start server with proper binding for deployment
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Listening on http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
  
  await initializeServices();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;