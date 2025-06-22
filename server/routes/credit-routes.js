const express = require('express');
const router = express.Router();
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const { AppError, ErrorCodes } = require('../utils/errors');
const logger = require('../utils/logger');
const ConfigService = require('../services/config-service');

// Initialize config service
const configService = new ConfigService();

// Configuration cache with TTL
let configCache = {
  data: null,
  lastFetch: 0,
  ttl: 5 * 60 * 1000 // 5 minutes TTL
};

/**
 * Get current configuration with caching
 */
const getConfig = async () => {
  const now = Date.now();

  if (configCache.data && (now - configCache.lastFetch) < configCache.ttl) {
    return configCache.data;
  }

  try {
    const config = await configService.getCreditConfiguration();
    configCache.data = config;
    configCache.lastFetch = now;
    return config;
  } catch (error) {
    logger.error('Failed to fetch configuration', { error: error.message });
    
    if (configCache.data) {
      return configCache.data;
    }
    
    return {
      version: 'default',
      overdraft: { maxAmount: 1000000, purposeMaxLength: 200, rateLimit: { windowMs: 600000, maxRequests: 5 } },
      credit: { maxAmount: 5000000, minTermMonths: 3, maxTermMonths: 12, purposeMaxLength: 500, rateLimit: { windowMs: 900000, maxRequests: 3 } },
      repayment: { rateLimit: { windowMs: 300000, maxRequests: 10 }, allowedPaymentMethods: ['bank_transfer', 'card', 'wallet'] },
      facilities: { maxPageSize: 50, defaultPageSize: 10 },
      general: { enableDetailedLogging: true, requirePurposeForOverdraft: false }
    };
  }
};

/**
 * Create dynamic rate limiter
 */
const createDynamicRateLimiter = (type) => {
  return async (req, res, next) => {
    try {
      const config = await getConfig();
      const rateLimitConfig = config[type]?.rateLimit;
      
      if (!rateLimitConfig) {
        return next();
      }
      
      const limiter = rateLimit({
        windowMs: rateLimitConfig.windowMs,
        max: rateLimitConfig.maxRequests,
        message: {
          success: false,
          message: `Too many ${type} requests, please try again later`,
          retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000),
          timestamp: new Date().toISOString()
        }
      });
      
      return limiter(req, res, next);
    } catch (error) {
      logger.error('Error in dynamic rate limiter', { type, error: error.message });
      next();
    }
  };
};

/**
 * Create dynamic validation schema
 */
const createDynamicSchema = async (type) => {
  const config = await getConfig();

  switch (type) {
    case 'overdraft':
      return Joi.object({
        amount: Joi.number().positive().max(config.overdraft.maxAmount).precision(2).required(),
        purpose: config.general.requirePurposeForOverdraft
          ? Joi.string().trim().max(config.overdraft.purposeMaxLength).required()
          : Joi.string().trim().max(config.overdraft.purposeMaxLength).optional()
      });

    case 'credit':
      return Joi.object({
        amount: Joi.number().positive().max(config.credit.maxAmount).precision(2).required(),
        termMonths: Joi.number().integer().min(config.credit.minTermMonths).max(config.credit.maxTermMonths).required(),
        purpose: Joi.string().trim().max(config.credit.purposeMaxLength).required()
      });

    case 'repayment':
      return Joi.object({
        facilityId: Joi.number().integer().positive().required(),
        amount: Joi.number().positive().precision(2).required(),
        paymentMethod: Joi.string().valid(...config.repayment.allowedPaymentMethods).optional()
      });

    default:
      throw new Error(`Unknown validation type: ${type}`);
  }
};

const validateRequest = (type) => {
  return async (req, res, next) => {
    try {
      const schema = await createDynamicSchema(type);
      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
          field: error.details[0].path[0],
          timestamp: new Date().toISOString()
        });
      }
      
      req.validatedBody = value;
      next();
    } catch (error) {
      logger.error('Validation error', { type, error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Validation configuration error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

module.exports = (creditService, authMiddleware) => {
  
  /**
   * Health check endpoint
   */
  router.get('/health', async (req, res) => {
    try {
      const config = await getConfig();
      res.json({
        success: true,
        message: 'Credit service is healthy',
        data: {
          service: 'credit-service',
          version: process.env.APP_VERSION || '1.0.0',
          uptime: process.uptime(),
          configVersion: config.version,
          configLastFetch: new Date(configCache.lastFetch).toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        message: 'Service degraded - configuration unavailable',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Get current configuration limits
   */
  router.get('/config', authMiddleware, async (req, res) => {
    try {
      const config = await getConfig();
      
      const publicConfig = {
        overdraft: {
          maxAmount: config.overdraft.maxAmount,
          purposeMaxLength: config.overdraft.purposeMaxLength,
          purposeRequired: config.general.requirePurposeForOverdraft
        },
        credit: {
          maxAmount: config.credit.maxAmount,
          minTermMonths: config.credit.minTermMonths,
          maxTermMonths: config.credit.maxTermMonths,
          purposeMaxLength: config.credit.purposeMaxLength
        },
        repayment: {
          allowedPaymentMethods: config.repayment.allowedPaymentMethods
        }
      };
      
      res.json({
        success: true,
        message: 'Configuration retrieved successfully',
        data: publicConfig,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to retrieve configuration', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve configuration',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Request overdraft facility
   */
  router.post('/overdraft', 
    authMiddleware, 
    createDynamicRateLimiter('overdraft'),
    validateRequest('overdraft'), 
    async (req, res) => {
      try {
        const { amount, purpose } = req.validatedBody;
        const userId = req.user.id;

        logger.info('Overdraft request initiated', { userId, amount, purpose });

        const result = await creditService.requestOverdraft(userId, amount, purpose);

        res.status(201).json({
          success: true,
          message: 'Overdraft request processed successfully',
          data: result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Overdraft request failed', { error: error.message, userId: req.user.id });
        
        if (error instanceof AppError) {
          return res.status(error.statusCode || 400).json({
            success: false,
          message: error.message,
          code: error.code
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to process overdraft request'
      });
    }
  });

  // Request credit facility
  router.post('/credit', authMiddleware, async (req, res) => {
    try {
      const { error, value } = creditRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const result = await creditService.requestCredit(
        req.user.id,
        value.amount,
        value.termMonths,
        value.purpose,
        req.ip
      );

      res.json({
        success: true,
        message: 'Credit application submitted successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: error.code
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to process credit request'
      });
    }
  });

  // Get user's credit facilities
  router.get('/facilities', authMiddleware, async (req, res) => {
    try {
      const facilities = await creditService.getUserCreditFacilities(req.user.id);
      
      res.json({
        success: true,
        data: facilities
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve credit facilities'
      });
    }
  });

  // Process repayment
  router.post('/repayment', authMiddleware, async (req, res) => {
    try {
      const { error, value } = repaymentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const result = await creditService.processRepayment(
        value.facilityId,
        value.amount,
        req.user.id,
        req.ip
      );

      res.json({
        success: true,
        message: 'Repayment processed successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: error.code
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to process repayment'
      });
    }
  });

  /**
   * Get repayment history for a facility
   */
  router.get('/repayments/:facilityId', authMiddleware, async (req, res) => {
    try {
      const facilityId = parseInt(req.params.facilityId);
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      if (isNaN(facilityId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid facility ID',
          timestamp: new Date().toISOString()
        });
      }

      logger.info('Fetching repayment history', { userId, facilityId, page, limit });

      const result = await creditService.getRepaymentHistory(userId, facilityId, { page: parseInt(page), limit: parseInt(limit) });

      res.json({
        success: true,
        message: 'Repayment history retrieved successfully',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to retrieve repayment history', { error: error.message, userId: req.user.id, facilityId });
      
      if (error instanceof AppError) {
        return res.status(error.statusCode || 400).json({
          success: false,
          message: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve repayment history',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Force refresh configuration cache (admin only)
   */
  router.post('/config/refresh', authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient privileges to refresh configuration',
          timestamp: new Date().toISOString()
        });
      }
      
      configCache.lastFetch = 0;
      const config = await getConfig();
      
      logger.info('Configuration manually refreshed', {
        userId: req.user.id,
        configVersion: config.version,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: 'Configuration refreshed successfully',
        data: {
          version: config.version,
          refreshedAt: new Date().toISOString(),
          refreshedBy: req.user.id
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to refresh configuration', { error: error.message, userId: req.user.id });
      res.status(500).json({
        success: false,
        message: 'Failed to refresh configuration',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
};