const jwt = require('jsonwebtoken');
const storage = require('../storage/MemoryStorage');

const JWT_SECRET = process.env.JWT_SECRET || 'centrika_dev_secret_key_2024';

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user exists
    const user = await storage.findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
      });
    }

    // Add user info to request
    req.user = {
      userId: decoded.userId,
      phoneNumber: decoded.phoneNumber,
      kycStatus: decoded.kycStatus,
      role: user.role || 'user',
    };

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin' && req.user.role !== 'ops_agent') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.',
        });
      }
      next();
    });
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

// KYC status check middleware
const requireKYC = (req, res, next) => {
  if (req.user.kycStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'KYC verification required',
      kycStatus: req.user.kycStatus,
    });
  }
  next();
};

// Rate limiting by user
const userRateLimit = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user?.userId;
    if (!userId) return next();

    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (requests.has(userId)) {
      const userRequests = requests.get(userId);
      const validRequests = userRequests.filter(time => time > windowStart);
      requests.set(userId, validRequests);
    }

    // Get current request count
    const currentRequests = requests.get(userId) || [];
    
    if (currentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    // Add current request
    currentRequests.push(now);
    requests.set(userId, currentRequests);

    next();
  };
};

// Transaction amount validation middleware
const validateTransactionAmount = (req, res, next) => {
  const { amount } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid transaction amount',
    });
  }

  if (amount > 1000000) { // BNR single transaction limit
    return res.status(400).json({
      success: false,
      message: 'Amount exceeds single transaction limit (1,000,000 RWF)',
    });
  }

  next();
};

// Phone number validation middleware
const validatePhoneNumber = (req, res, next) => {
  const { phoneNumber, recipientPhone } = req.body;
  const phone = phoneNumber || recipientPhone;
  
  if (phone && !/^(\+250|250)?[0-9]{9}$/.test(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format',
    });
  }

  next();
};

// API key validation (for external services)
const validateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

  if (!apiKey || !validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key',
    });
  }

  next();
};

// CORS middleware for specific origins
const corsAuth = (allowedOrigins = []) => {
  return (req, res, next) => {
    const origin = req.get('Origin');
    
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      return res.status(403).json({
        success: false,
        message: 'Origin not allowed',
      });
    }

    next();
  };
};

// Request logging middleware
const logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.userId,
      timestamp: new Date().toISOString(),
    };
    
    console.log(JSON.stringify(logData));
  });

  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
  });
  
  next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize common input fields
  const fieldsToSanitize = ['note', 'description', 'firstName', 'lastName'];
  
  fieldsToSanitize.forEach(field => {
    if (req.body[field] && typeof req.body[field] === 'string') {
      // Remove potentially dangerous characters
      req.body[field] = req.body[field]
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .trim();
    }
  });

  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
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

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = {
  auth,
  adminAuth,
  requireKYC,
  userRateLimit,
  validateTransactionAmount,
  validatePhoneNumber,
  validateApiKey,
  corsAuth,
  logRequest,
  securityHeaders,
  sanitizeInput,
  errorHandler,
};
