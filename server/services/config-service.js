const axios = require('axios');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const { AppError, ErrorCodes } = require('../utils/errors');

/**
 * Configuration Service for dynamic back-office configuration management
 * Handles fetching, caching, validation, and real-time updates of system configurations
 */
class ConfigService extends EventEmitter {
  constructor() {
    super();
    
    // Configuration cache
    this.cache = new Map();
    
    // Default TTL for configurations (5 minutes)
    this.defaultTtl = 5 * 60 * 1000;
    
    // Back office API configuration
    this.backOfficeConfig = {
      baseUrl: process.env.BACK_OFFICE_API_URL || 'http://localhost:3000/api',
      apiKey: process.env.BACK_OFFICE_API_KEY || 'default-api-key',
      timeout: parseInt(process.env.BACK_OFFICE_TIMEOUT) || 10000,
      retryAttempts: parseInt(process.env.BACK_OFFICE_RETRY_ATTEMPTS) || 3,
      retryDelay: parseInt(process.env.BACK_OFFICE_RETRY_DELAY) || 1000
    };
    
    // HTTP client for back office communication
    this.httpClient = axios.create({
      baseURL: this.backOfficeConfig.baseUrl,
      timeout: this.backOfficeConfig.timeout,
      headers: {
        'Authorization': `Bearer ${this.backOfficeConfig.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': `credit-service/${process.env.APP_VERSION || '1.0.0'}`
      }
    });
    
    // Request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug('Back office API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          timestamp: new Date().toISOString()
        });
        return config;
      },
      (error) => {
        logger.error('Back office API request error', { error: error.message });
        return Promise.reject(error);
      }
    );
    
    // Response interceptor for logging and error handling
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug('Back office API response', {
          status: response.status,
          url: response.config.url,
          responseTime: response.headers['x-response-time'],
          timestamp: new Date().toISOString()
        });
        return response;
      },
      (error) => {
        logger.error('Back office API response error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
          timestamp: new Date().toISOString()
        });
        return Promise.reject(error);
      }
    );
    
    // Initialize periodic health checks
    this.initializeHealthChecks();
  }

  /**
   * Get credit configuration with caching and fallback mechanisms
   * @param {Object} options - Configuration options
   * @param {boolean} options.forceRefresh - Force refresh from back office
   * @param {string} options.environment - Environment specific config
   * @param {string} options.userSegment - User segment for A/B testing
   * @returns {Promise<Object>} Configuration object
   */
  async getCreditConfiguration(options = {}) {
    const cacheKey = this.buildCacheKey('credit', options);

    try {
      // Return cached config if valid and not forcing refresh
      if (!options.forceRefresh) {
        const cached = this.getCachedConfig(cacheKey);
        if (cached) {
          logger.debug('Returning cached credit configuration', { 
            cacheKey, 
            version: cached.version,
            age: Date.now() - cached.cachedAt
          });
          return cached;
        }
      }
      
      // Fetch fresh configuration from back office
      const config = await this.fetchConfigurationFromBackOffice('credit', options);
      
      // Validate configuration structure
      this.validateCreditConfiguration(config);
      
      // Cache the configuration
      this.setCachedConfig(cacheKey, config);
      
      // Emit configuration update event
      this.emit('configurationUpdated', {
        type: 'credit',
        version: config.version,
        cacheKey,
        timestamp: new Date().toISOString()
      });
      
      logger.info('Credit configuration fetched successfully', {
        version: config.version,
        cacheKey,
        environment: options.environment,
        userSegment: options.userSegment
      });
      
      return config;
      
    } catch (error) {
      logger.error('Failed to get credit configuration', {
        error: error.message,
        cacheKey,
        options,
        timestamp: new Date().toISOString()
      });
      
      // Try to return stale cache as fallback
      const staleCache = this.getStaleCache(cacheKey);
      if (staleCache) {
        logger.warn('Using stale cached configuration as fallback', {
          cacheKey,
          version: staleCache.version,
          age: Date.now() - staleCache.cachedAt
        });
        return staleCache;
      }
      
      // Return default configuration as last resort
      logger.warn('Using default configuration as last resort', { cacheKey });
      return this.getDefaultCreditConfiguration();
    }
  }

  /**
   * Update credit configuration in back office
   * @param {Object} config - Configuration to update
   * @param {Object} metadata - Update metadata (user, reason, etc.)
   * @returns {Promise<Object>} Updated configuration
   */
  async updateCreditConfiguration(config, metadata = {}) {
    try {
      // Validate configuration before updating
      this.validateCreditConfiguration(config);
      
      // Prepare update payload
      const updatePayload = {
        configuration: config,
        metadata: {
          updatedBy: metadata.userId || 'system',
          reason: metadata.reason || 'Configuration update',
          timestamp: new Date().toISOString(),
          source: metadata.source || 'credit-service',
          environment: metadata.environment || process.env.NODE_ENV || 'development'
        }
      };
      
      logger.info('Updating credit configuration', {
        version: config.version,
        updatedBy: updatePayload.metadata.updatedBy,
        reason: updatePayload.metadata.reason
      });
      
      // Send update to back office with retry logic
      const response = await this.retryOperation(
        () => this.httpClient.put('/configurations/credit', updatePayload),
        this.backOfficeConfig.retryAttempts
      );
      
      const updatedConfig = response.data.configuration;
      
      // Invalidate all related cache entries
      this.invalidateConfigurationCache('credit');
      
      // Emit configuration change event
      this.emit('configurationChanged', {
        type: 'credit',
        oldVersion: config.version,
        newVersion: updatedConfig.version,
        updatedBy: updatePayload.metadata.updatedBy,
        timestamp: new Date().toISOString()
      });
      
      logger.info('Credit configuration updated successfully', {
        oldVersion: config.version,
        newVersion: updatedConfig.version,
        updatedBy: updatePayload.metadata.updatedBy
      });
      
      return updatedConfig;

    } catch (error) {
      logger.error('Failed to update credit configuration', {
        error: error.message,
        version: config.version,
        metadata,
        timestamp: new Date().toISOString()
      });
      
      throw new AppError(
        'Failed to update configuration',
        ErrorCodes.CONFIG_UPDATE_FAILED,
        500,
        { originalError: error.message }
      );
    }
  }

  /**
   * Validate environment and service health
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    const healthStatus = {
      service: 'config-service',
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        backOfficeConnection: { status: 'unknown' },
        cache: { status: 'healthy', size: this.cache.size },
        configuration: { status: 'unknown' }
      }
    };

    try {
      // Test back office connection
      const startTime = Date.now();
      await this.httpClient.get('/health');
      const responseTime = Date.now() - startTime;
      
      healthStatus.checks.backOfficeConnection = {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        lastCheck: new Date().toISOString()
      };
      
      // Test configuration retrieval
      try {
        await this.getCreditConfiguration({ forceRefresh: false });
        healthStatus.checks.configuration = {
          status: 'healthy',
          lastConfigFetch: new Date().toISOString()
        };
      } catch (configError) {
        healthStatus.checks.configuration = {
          status: 'degraded',
          error: configError.message,
          lastConfigFetch: new Date().toISOString()
        };
        healthStatus.status = 'degraded';
      }
      
    } catch (error) {
      healthStatus.checks.backOfficeConnection = {
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
      healthStatus.status = 'degraded';
    }

    return healthStatus;
  }

  /**
   * Fetch configuration from back office with environment and segment support
   * @private
   */
  async fetchConfigurationFromBackOffice(type, options = {}) {
    const queryParams = new URLSearchParams();

    if (options.environment) {
      queryParams.append('environment', options.environment);
    }

    if (options.userSegment) {
      queryParams.append('userSegment', options.userSegment);
    }

    const url = `/configurations/${type}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await this.retryOperation(
      () => this.httpClient.get(url),
      this.backOfficeConfig.retryAttempts
    );

    return response.data.configuration;
  }

  /**
   * Validate credit configuration structure
   * @private
   */
  validateCreditConfiguration(config) {
    const requiredFields = [
      'version',
      'overdraft',
      'credit',
      'repayment',
      'facilities',
      'general'
    ];

    // Check required top-level fields
    requiredFields.forEach(field => {
      if (!config[field]) {
        throw new AppError(
          `Missing required configuration field: ${field}`,
          ErrorCodes.INVALID_CONFIG_STRUCTURE,
          400
        );
      }
    });

    // Validate overdraft configuration
    this.validateOverdraftConfig(config.overdraft);

    // Validate credit configuration
    this.validateCreditConfig(config.credit);

    // Validate repayment configuration
    this.validateRepaymentConfig(config.repayment);

    // Validate facilities configuration
    this.validateFacilitiesConfig(config.facilities);

    // Validate general configuration
    this.validateGeneralConfig(config.general);
  }

  // Helper methods
  buildCacheKey(type, options) {
    const keyParts = [type];
    if (options.environment) keyParts.push(`env:${options.environment}`);
    if (options.userSegment) keyParts.push(`seg:${options.userSegment}`);
    return keyParts.join('_');
  }

  getCachedConfig(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.cachedAt) < this.defaultTtl) {
      return cached;
    }
    return null;
  }

  setCachedConfig(cacheKey, config) {
    this.cache.set(cacheKey, {
      ...config,
      cachedAt: Date.now()
    });
  }

  getStaleCache(cacheKey) {
    return this.cache.get(cacheKey);
  }

  invalidateConfigurationCache(type) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(type)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  async retryOperation(operation, maxAttempts) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          const delay = this.backOfficeConfig.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  initializeHealthChecks() {
    // Implement periodic health checks if needed
    setInterval(async () => {
      try {
        await this.getHealthStatus();
      } catch (error) {
        logger.error('Health check failed', { error: error.message });
      }
    }, 60000); // Every minute
  }

  // Validation helper methods
  validateOverdraftConfig(overdraftConfig) {
    const required = ['maxAmount', 'purposeMaxLength', 'rateLimit'];
    required.forEach(field => {
      if (overdraftConfig[field] === undefined) {
        throw new AppError(
          `Missing overdraft configuration field: ${field}`,
          ErrorCodes.INVALID_CONFIG_STRUCTURE,
          400
        );
      }
    });
  }

  validateCreditConfig(creditConfig) {
    const required = ['maxAmount', 'minTermMonths', 'maxTermMonths', 'purposeMaxLength', 'rateLimit'];
    required.forEach(field => {
      if (creditConfig[field] === undefined) {
        throw new AppError(
          `Missing credit configuration field: ${field}`,
          ErrorCodes.INVALID_CONFIG_STRUCTURE,
          400
        );
      }
    });
  }

  validateRepaymentConfig(repaymentConfig) {
    const required = ['rateLimit', 'allowedPaymentMethods'];
    required.forEach(field => {
      if (repaymentConfig[field] === undefined) {
        throw new AppError(
          `Missing repayment configuration field: ${field}`,
          ErrorCodes.INVALID_CONFIG_STRUCTURE,
          400
        );
      }
    });
  }

  validateFacilitiesConfig(facilitiesConfig) {
    const required = ['maxPageSize', 'defaultPageSize'];
    required.forEach(field => {
      if (facilitiesConfig[field] === undefined) {
        throw new AppError(
          `Missing facilities configuration field: ${field}`,
          ErrorCodes.INVALID_CONFIG_STRUCTURE,
          400
        );
      }
    });
  }

  validateGeneralConfig(generalConfig) {
    const required = ['configCacheTtl', 'enableDetailedLogging'];
    required.forEach(field => {
      if (generalConfig[field] === undefined) {
        throw new AppError(
          `Missing general configuration field: ${field}`,
          ErrorCodes.INVALID_CONFIG_STRUCTURE,
          400
        );
      }
    });
  }

  getDefaultCreditConfiguration() {
    return {
      version: 'default',
      overdraft: {
        maxAmount: 1000000,
        purposeMaxLength: 200,
        rateLimit: {
          windowMs: 10 * 60 * 1000,
          maxRequests: 5
        }
      },
      credit: {
        maxAmount: 5000000,
        minTermMonths: 3,
        maxTermMonths: 12,
        purposeMaxLength: 500,
        rateLimit: {
          windowMs: 15 * 60 * 1000,
          maxRequests: 3
        }
      },
      repayment: {
        rateLimit: {
          windowMs: 5 * 60 * 1000,
          maxRequests: 10
        },
        allowedPaymentMethods: ['bank_transfer', 'card', 'wallet']
      },
      facilities: {
        maxPageSize: 50,
        defaultPageSize: 10
      },
      general: {
        configCacheTtl: 5 * 60 * 1000,
        enableDetailedLogging: true,
        requirePurposeForOverdraft: false
      }
    };
  }
}

module.exports = ConfigService;