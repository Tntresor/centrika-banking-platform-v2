const { AppError, ErrorCodes } = require('../utils/errors');
const { Logger } = require('../utils/logger');

/**
 * Middleware to enforce compliance requirements
 */
class ComplianceMiddleware {
  constructor(kycService, auditService) {
    this.kycService = kycService;
    this.auditService = auditService;
    this.logger = new Logger('ComplianceMiddleware');
  }

  /**
   * Create middleware function
   */
  createMiddleware() {
    return async (req, res, next) => {
      try {
        // Skip for public routes and non-financial operations
        if (this._shouldSkipCompliance(req)) {
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
        if (this._requiresKYCVerification(req)) {
          const isVerified = await this.kycService.isVerified(req.user.id);
          
          if (!isVerified) {
            // Log compliance block
            await this.auditService.log('compliance_block', req.user.id, {
              reason: 'kyc_verification_required',
              endpoint: req.path,
              method: req.method,
              ip: req.ip
            });
            
            return res.status(403).json({
              success: false,
              message: 'KYC verification required for this operation',
              code: 'KYC_REQUIRED'
            });
          }
        }
        
        // Check transaction limits for payment operations
        if (this._isFinancialOperation(req)) {
          const amount = parseFloat(req.body.amount);
          
          if (amount && amount > 0) {
            // Get KYC tier for user
            const kycTier = await this.kycService.getKycTier(req.user.id);
            const limits = this.kycService.getTransactionLimits(kycTier);
            
            // Check single transaction limit
            if (amount > limits.single) {
              await this.auditService.log('transaction_limit_exceeded', req.user.id, {
                amount,
                limit: limits.single,
                limitType: 'single_transaction',
                endpoint: req.path,
                ip: req.ip
              });
              
              return res.status(403).json({
                success: false,
                message: `Transaction amount exceeds limit of ${limits.single.toLocaleString()} RWF`,
                code: 'AMOUNT_LIMIT_EXCEEDED',
                data: { limit: limits.single, amount }
              });
            }
            
            // Log high-value transaction
            if (amount > 500000) {
              await this.auditService.log('high_value_transaction', req.user.id, {
                amount,
                endpoint: req.path,
                ip: req.ip,
                kycTier
              });
            }
          }
        }
        
        next();
      } catch (error) {
        this.logger.error('Compliance middleware error', { 
          error: error.message,
          path: req.path,
          userId: req.user?.id 
        });
        next(error);
      }
    };
  }

  /**
   * Check if compliance should be skipped for this request
   */
  _shouldSkipCompliance(req) {
    const skipPaths = [
      '/api/auth',
      '/api/kyc',
      '/health',
      '/metrics',
      '/'
    ];
    
    return skipPaths.some(path => req.path.startsWith(path)) || 
           req.method === 'GET';
  }

  /**
   * Check if operation requires KYC verification
   */
  _requiresKYCVerification(req) {
    const kycRequiredPaths = [
      '/api/transfers',
      '/api/payments',
      '/api/cards',
      '/api/credit'
    ];
    
    return kycRequiredPaths.some(path => req.path.startsWith(path));
  }

  /**
   * Check if this is a financial operation
   */
  _isFinancialOperation(req) {
    const financialPaths = [
      '/api/transfers',
      '/api/payments',
      '/api/withdrawals',
      '/api/deposits'
    ];
    
    return financialPaths.some(path => req.path.startsWith(path)) &&
           ['POST', 'PUT'].includes(req.method);
  }
}

/**
 * Factory function to create compliance middleware
 */
function createComplianceMiddleware(kycService, auditService) {
  const middleware = new ComplianceMiddleware(kycService, auditService);
  return middleware.createMiddleware();
}

module.exports = { ComplianceMiddleware, createComplianceMiddleware };