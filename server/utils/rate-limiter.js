const Redis = require('ioredis');
const { Logger } = require('./logger');

class RateLimiter {
  constructor() {
    this.logger = new Logger('RateLimiter');
    
    // Initialize Redis connection
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      lazyConnect: true
    });

    // Rate limit configurations
    this.limits = {
      user_creation: { requests: 5, window: 3600 }, // 5 per hour
      login_attempt: { requests: 10, window: 900 }, // 10 per 15 min
      password_change: { requests: 3, window: 3600 }, // 3 per hour
      transaction: { requests: 50, window: 3600 }, // 50 per hour  
      api_general: { requests: 100, window: 900 } // 100 per 15 min
    };

    // Redis connection events
    this.redis.on('connect', () => {
      this.logger.info('Redis connected for rate limiting');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', { error: error.message });
    });
  }

  async check(action, identifier) {
    try {
      const limit = this.limits[action] || this.limits.api_general;
      const key = `rate_limit:${action}:${identifier}`;
      
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, limit.window);
      pipeline.ttl(key);
      
      const results = await pipeline.exec();
      
      if (results.some(([err]) => err)) {
        throw new Error('Redis pipeline error');
      }

      const count = results[0][1];
      const ttl = results[2][1];

      // If this is the first request, set expiration
      if (count === 1 && ttl === -1) {
        await this.redis.expire(key, limit.window);
      }

      const isAllowed = count <= limit.requests;
      
      this.logger.debug('Rate limit check', {
        action,
        identifier,
        count,
        limit: limit.requests,
        isAllowed,
        ttl
      });

      return isAllowed;

    } catch (error) {
      this.logger.error('Rate limit check failed', { 
        action, 
        identifier, 
        error: error.message 
      });
      // Fail open - allow request if Redis is down
      return true;
    }
  }

  async getRemainingRequests(action, identifier) {
    try {
      const limit = this.limits[action] || this.limits.api_general;
      const key = `rate_limit:${action}:${identifier}`;
      
      const current = await this.redis.get(key);
      const remaining = Math.max(0, limit.requests - (parseInt(current) || 0));
      
      return remaining;

    } catch (error) {
      this.logger.error('Failed to get remaining requests', {
        action,
        identifier,
        error: error.message
      });
      return 0;
    }
  }

  async reset(action, identifier) {
    try {
      const key = `rate_limit:${action}:${identifier}`;
      await this.redis.del(key);
      
      this.logger.info('Rate limit reset', { action, identifier });

    } catch (error) {
      this.logger.error('Failed to reset rate limit', {
        action,
        identifier,
        error: error.message
      });
    }
  }

  async resetAll() {
    try {
      const keys = await this.redis.keys('rate_limit:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      this.logger.info('All rate limits reset', { keysDeleted: keys.length });

    } catch (error) {
      this.logger.error('Failed to reset all rate limits', { error: error.message });
    }
  }

  // Get rate limit info for monitoring
  async getStats(action, identifier) {
    try {
      const limit = this.limits[action] || this.limits.api_general;
      const key = `rate_limit:${action}:${identifier}`;
      
      const [current, ttl] = await Promise.all([
        this.redis.get(key),
        this.redis.ttl(key)
      ]);

      return {
        action,
        identifier,
        current: parseInt(current) || 0,
        limit: limit.requests,
        remaining: Math.max(0, limit.requests - (parseInt(current) || 0)),
        resetTime: ttl > 0 ? Date.now() + (ttl * 1000) : null,
        window: limit.window
      };

    } catch (error) {
      this.logger.error('Failed to get rate limit stats', {
        action,
        identifier,
        error: error.message
      });
      return null;
    }
  }

  async disconnect() {
    try {
      await this.redis.disconnect();
      this.logger.info('Redis disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Redis', { error: error.message });
    }
  }
}

module.exports = { RateLimiter };