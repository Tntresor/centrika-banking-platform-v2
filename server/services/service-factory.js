const { Pool } = require('pg');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { getEncryptionService } = require('./encryption-service');
const { UserService } = require('./user-service');
const { StorageService } = require('../utils/storage');
// Audit service will be created inline
const { RateLimiter } = require('../utils/rate-limiter');
const { CONFIG, validateConfig } = require('../config');
const { Logger } = require('../utils/logger');
const { AppError, ErrorCodes } = require('../utils/errors');

class ServiceFactory {
  constructor() {
    this.logger = new Logger('ServiceFactory');
    this.services = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Validate configuration
      validateConfig();

      // Initialize database pool
      this.dbPool = new Pool({
        connectionString: CONFIG.database.url,
        ssl: CONFIG.database.ssl ? { rejectUnauthorized: false } : false,
        min: CONFIG.database.pool.min,
        max: CONFIG.database.pool.max,
        idleTimeoutMillis: CONFIG.database.idleTimeout,
        connectionTimeoutMillis: CONFIG.database.connectionTimeout
      });

      // Test database connection
      await this.dbPool.query('SELECT NOW()');
      this.logger.info('Database connection established');

      // Initialize services in dependency order
      await this._initializeServices();

      this.initialized = true;
      this.logger.info('ServiceFactory initialized successfully');

    } catch (error) {
      this.logger.error('ServiceFactory initialization failed', { error: error.message });
      throw error;
    }
  }

  async _initializeServices() {
    // 1. Initialize encryption service
    const encryptionService = getEncryptionService({
      encryptionKey: CONFIG.encryption.key
    });
    this.services.set('encryption', encryptionService);

    // 2. Initialize storage service
    const storageService = new StorageService(this.dbPool, encryptionService);
    this.services.set('storage', storageService);

    // 3. Initialize rate limiter
    const rateLimiter = new RateLimiter();
    this.services.set('rateLimiter', rateLimiter);

    // 4. Initialize audit service
    const auditService = new AuditService(storageService);
    this.services.set('audit', auditService);

    // 5. Initialize user service
    const userService = new UserService();
    this.services.set('user', userService);

    this.logger.info('All services initialized');
  }

  getService(name) {
    if (!this.initialized) {
      throw new Error('ServiceFactory not initialized. Call initialize() first.');
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }

    return service;
  }

  async shutdown() {
    try {
      this.logger.info('Shutting down services...');

      // Shutdown rate limiter (Redis connection)
      const rateLimiter = this.services.get('rateLimiter');
      if (rateLimiter && rateLimiter.disconnect) {
        await rateLimiter.disconnect();
      }

      // Close database pool
      if (this.dbPool) {
        await this.dbPool.end();
        this.logger.info('Database pool closed');
      }

      // Clear services
      this.services.clear();
      this.initialized = false;

      this.logger.info('ServiceFactory shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown', { error: error.message });
    }
  }

  // Health check for all services
  async healthCheck() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {}
    };

    try {
      // Database health
      const dbStart = Date.now();
      await this.dbPool.query('SELECT 1');
      results.services.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart
      };

      // Encryption service health
      const encryptionService = this.getService('encryption');
      const testData = 'health-check';
      const encrypted = encryptionService.encrypt(testData);
      const decrypted = encryptionService.decrypt(encrypted);
      
      results.services.encryption = {
        status: decrypted === testData ? 'healthy' : 'unhealthy',
        responseTime: 1 // Very fast operation
      };

      // Storage service health
      const storageService = this.getService('storage');
      const storageHealth = await storageService.healthCheck();
      results.services.storage = storageHealth;

    } catch (error) {
      results.status = 'unhealthy';
      results.error = error.message;
    }

    return results;
  }
}

// Express App Factory
class AppFactory {
  constructor() {
    this.serviceFactory = new ServiceFactory();
    this.logger = new Logger('AppFactory');
  }

  async createApp() {
    // Initialize services first
    await this.serviceFactory.initialize();

    const app = express();

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    app.use(cors({
      origin: CONFIG.cors.origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID']
    }));

    // Compression
    app.use(compression());

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(cookieParser());

    // Middleware factory
    const middlewareFactory = new MiddlewareFactory(this.serviceFactory);

    // Global middleware
    app.use(middlewareFactory.correlationId());
    app.use(middlewareFactory.requestLogger());
    app.use(middlewareFactory.clientInfo());

    // Health check endpoint (before other routes)
    app.get('/health', async (req, res) => {
      try {
        const health = await this.serviceFactory.healthCheck();
        res.status(health.status === 'healthy' ? 200 : 503).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        service: 'Centrika Banking API',
        status: 'operational',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // API routes
    app.use('/api', this._createApiRoutes(middlewareFactory));

    // Global error handler
    app.use(middlewareFactory.errorHandler());

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found'
        }
      });
    });

    return app;
  }

  _createApiRoutes(middlewareFactory) {
    const router = express.Router();

    // Auth routes
    const authRoutes = require('../routes/auth-enhanced');
    router.use('/auth', authRoutes(this.serviceFactory, middlewareFactory));

    return router;
  }

  async shutdown() {
    await this.serviceFactory.shutdown();
  }
}

// Enhanced Middleware Factory
class MiddlewareFactory {
  constructor(serviceFactory) {
    this.serviceFactory = serviceFactory;
    this.logger = new Logger('MiddlewareFactory');
  }

  // Error handling middleware
  errorHandler() {
    return (error, req, res, next) => {
      const correlationId = req.correlationId || 'unknown';
      
      this.logger.error('Request error', {
        correlationId,
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Handle different error types
      if (error.name === 'AppError') {
        return res.status(this._getHttpStatusFromErrorCode(error.code)).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            correlationId
          }
        });
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.details,
            correlationId
          }
        });
      }

      // Generic server error
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          correlationId
        }
      });
    };
  }

  // Request correlation ID middleware
  correlationId() {
    return (req, res, next) => {
      req.correlationId = req.get('X-Correlation-ID') || 
                         require('crypto').randomUUID();
      res.set('X-Correlation-ID', req.correlationId);
      next();
    };
  }

  // Request logging middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        this.logger.info('Request completed', {
          correlationId: req.correlationId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          userId: req.user?.id || null
        });
      });
      
      next();
    };
  }

  // Client info extraction middleware
  clientInfo() {
    return (req, res, next) => {
      req.clientInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        acceptLanguage: req.get('Accept-Language'),
        correlationId: req.correlationId
      };
      next();
    };
  }

  // Rate limiting middleware
  rateLimit(action) {
    return async (req, res, next) => {
      try {
        const rateLimiter = this.serviceFactory.getService('rateLimiter');
        const identifier = req.ip;
        
        const isAllowed = await rateLimiter.check(action, identifier);
        
        if (!isAllowed) {
          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again later.'
            }
          });
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  _getHttpStatusFromErrorCode(errorCode) {
    const statusMap = {
      'VALIDATION_ERROR': 400,
      'UNAUTHORIZED': 401,
      'ACCOUNT_LOCKED': 401,
      'INVALID_CREDENTIALS': 401,
      'USER_NOT_FOUND': 404,
      'USER_EXISTS': 409,
      'RATE_LIMIT_EXCEEDED': 429,
      'DATABASE_ERROR': 500,
      'CRYPTO_ERROR': 500,
      'CONFIG_ERROR': 500,
      'EXTERNAL_SERVICE_ERROR': 502
    };

    return statusMap[errorCode] || 500;
  }
}

// Singleton instance
let serviceFactory = null;

function getServiceFactory() {
  if (!serviceFactory) {
    serviceFactory = new ServiceFactory();
  }
  return serviceFactory;
}

// Enhanced Audit Service
class AuditService {
  constructor(storageService) {
    this.storage = storageService;
    this.logger = new Logger('AuditService');
  }

  async log(action, userId, eventData = {}, client = null) {
    try {
      const auditEntry = {
        user_id: userId,
        action,
        event_data: eventData,
        correlation_id: eventData.correlationId || null,
        ip_address: eventData.clientInfo?.ip || null,
        user_agent: eventData.clientInfo?.userAgent || null,
        session_id: eventData.sessionId || null,
        created_at: new Date()
      };

      const query = `
        INSERT INTO audit_logs (
          user_id, action, event_data, correlation_id, 
          ip_address, user_agent, session_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;

      const values = [
        auditEntry.user_id,
        auditEntry.action,
        JSON.stringify(auditEntry.event_data),
        auditEntry.correlation_id,
        auditEntry.ip_address,
        auditEntry.user_agent,
        auditEntry.session_id,
        auditEntry.created_at
      ];

      const executor = client || this.storage.pool;
      const result = await executor.query(query, values);

      this.logger.debug('Audit log created', {
        auditId: result.rows[0].id,
        action,
        userId,
        correlationId: auditEntry.correlation_id
      });

      return result.rows[0].id;

    } catch (error) {
      this.logger.error('Failed to create audit log', {
        action,
        userId,
        error: error.message
      });
      // Don't throw - audit logging shouldn't break main operations
    }
  }

  async getAuditTrail(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        action = null,
        startDate = null,
        endDate = null
      } = options;

      let query = `
        SELECT 
          id, action, event_data, ip_address, 
          user_agent, created_at, correlation_id
        FROM audit_logs 
        WHERE user_id = $1
      `;

      const params = [userId];
      let paramIndex = 2;

      if (action) {
        query += ` AND action = $${paramIndex}`;
        params.push(action);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.storage.pool.query(query, params);
      return result.rows;

    } catch (error) {
      this.logger.error('Failed to get audit trail', {
        userId,
        error: error.message
      });
      throw error;
    }
  }
}

// Audit action constants
const auditActions = {
  USER_CREATED: 'USER_CREATED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  WALLET_CREATED: 'WALLET_CREATED',
  TRANSACTION_INITIATED: 'TRANSACTION_INITIATED',
  TRANSACTION_COMPLETED: 'TRANSACTION_COMPLETED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  KYC_SUBMITTED: 'KYC_SUBMITTED',
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_EXPIRED: 'SESSION_EXPIRED'
};

module.exports = { 
  ServiceFactory, 
  AppFactory, 
  MiddlewareFactory,
  AuditService,
  auditActions,
  getServiceFactory 
};