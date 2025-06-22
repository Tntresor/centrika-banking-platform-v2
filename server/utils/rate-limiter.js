const NodeCache = require('node-cache');

class RateLimiter {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 900, // 15 minutes default TTL
      checkperiod: 60, // Check for expired keys every minute
      useClones: false
    });

    // Rate limit configurations
    this.limits = {
      user_creation: { maxRequests: 3, windowMs: 3600000 }, // 3 per hour
      login_attempt: { maxRequests: 5, windowMs: 900000 },  // 5 per 15 minutes
      password_change: { maxRequests: 3, windowMs: 3600000 }, // 3 per hour
      transaction: { maxRequests: 50, windowMs: 3600000 },   // 50 per hour
      api_general: { maxRequests: 100, windowMs: 900000 }    // 100 per 15 minutes
    };
  }

  async check(action, identifier) {
    const config = this.limits[action] || this.limits.api_general;
    const key = `${action}:${identifier}`;
    
    const current = this.cache.get(key) || { count: 0, resetTime: Date.now() + config.windowMs };
    
    // Check if window has expired
    if (Date.now() > current.resetTime) {
      current.count = 0;
      current.resetTime = Date.now() + config.windowMs;
    }

    // Check if limit exceeded
    if (current.count >= config.maxRequests) {
      return false;
    }

    // Increment counter
    current.count++;
    this.cache.set(key, current, Math.floor(config.windowMs / 1000));

    return true;
  }

  async getRemainingRequests(action, identifier) {
    const config = this.limits[action] || this.limits.api_general;
    const key = `${action}:${identifier}`;
    
    const current = this.cache.get(key) || { count: 0, resetTime: Date.now() + config.windowMs };
    
    if (Date.now() > current.resetTime) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - current.count);
  }

  async reset(action, identifier) {
    const key = `${action}:${identifier}`;
    this.cache.del(key);
  }

  async resetAll() {
    this.cache.flushAll();
  }
}

module.exports = { RateLimiter };