const { kycService } = require('../services/kyc-service');
const { auditLog, auditActions } = require('../services/audit-service');

// Compliance middleware for financial operations
const complianceMiddleware = async (req, res, next) => {
  try {
    // Skip for public routes
    if (req.path.startsWith('/api/auth') || req.path === '/health' || req.path === '/api') {
      return next();
    }
    
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check KYC verification for sensitive operations
    const sensitiveOperations = [
      '/api/transactions/p2p',
      '/api/transactions/transfer',
      '/api/momo/deposit',
      '/api/momo/withdraw',
      '/api/cards/generate'
    ];
    
    const isSensitiveOperation = sensitiveOperations.some(path => 
      req.path.startsWith(path)
    );
    
    if (isSensitiveOperation) {
      const isVerified = await kycService.isVerified(req.user.userId);
      
      if (!isVerified) {
        // Log compliance violation
        await auditLog(auditActions.SECURITY_VIOLATION, req.user.userId, {
          action: 'attempted_operation_without_kyc',
          endpoint: req.path,
          method: req.method,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(403).json({
          success: false,
          message: 'KYC verification required for this operation',
          kycStatus: req.user.kycStatus || 'pending',
          requiresKYC: true
        });
      }
    }
    
    // Transaction amount limits based on KYC level
    if (req.body.amount && (req.path.includes('/transfer') || req.path.includes('/p2p'))) {
      const amount = parseFloat(req.body.amount);
      const kycStatus = await kycService.getKYCStatus(req.user.userId);
      
      // BNR Tier II limits implementation
      const limits = {
        pending: { single: 50000, daily: 100000, balance: 200000 }, // RWF
        under_review: { single: 200000, daily: 500000, balance: 1000000 },
        approved: { single: 1000000, daily: 1000000, balance: 2000000 }
      };
      
      const userLimits = limits[kycStatus.kyc_status] || limits.pending;
      
      if (amount > userLimits.single) {
        await auditLog(auditActions.SECURITY_VIOLATION, req.user.userId, {
          action: 'transaction_limit_exceeded',
          amount,
          limit: userLimits.single,
          kycStatus: kycStatus.kyc_status,
          ip: req.ip || req.connection.remoteAddress
        });
        
        return res.status(400).json({
          success: false,
          message: `Transaction amount exceeds your limit of ${userLimits.single.toLocaleString()} RWF`,
          limits: userLimits,
          kycStatus: kycStatus.kyc_status
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Compliance middleware error:', error);
    next(error);
  }
};

// Rate limiting for different user tiers
const tierBasedRateLimit = (req, res, next) => {
  // This would integrate with the rate limiting middleware
  // to provide different limits based on KYC status
  next();
};

module.exports = {
  complianceMiddleware,
  tierBasedRateLimit
};