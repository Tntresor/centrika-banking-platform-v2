const jwt = require('jsonwebtoken');
const { getJWTSecret } = require('../utils/security');
const { auditLog, auditActions } = require('../services/audit-service');

const JWT_SECRET = getJWTSecret();

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Log authenticated access
    await auditLog(auditActions.DATA_ACCESS, decoded.userId, {
      endpoint: req.path,
      method: req.method,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    next();
  } catch (error) {
    // Log invalid token attempt
    await auditLog(auditActions.SECURITY_VIOLATION, null, {
      action: 'invalid_token_attempt',
      endpoint: req.path,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      error: error.message
    });

    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// KYC verification middleware
const requireKYCVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check if user has completed KYC for sensitive operations
  if (req.user.kycStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'KYC verification required for this operation',
      kycStatus: req.user.kycStatus
    });
  }

  next();
};

// Admin authentication middleware
const requireAdminRole = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireKYCVerification,
  requireAdminRole
};