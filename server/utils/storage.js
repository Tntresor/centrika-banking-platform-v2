const { Pool } = require('pg');
const { AppError, ErrorCodes } = require('./errors');
const { Logger } = require('./logger');

class StorageService {
  constructor(pool, encryptionService) {
    this.pool = pool;
    this.encryption = encryptionService;
    this.logger = new Logger('StorageService');
  }

  async executeTransaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Transaction failed', { error: error.message });
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Transaction failed', error);
    } finally {
      client.release();
    }
  }

  async getUserByPhone(phone) {
    try {
      const phoneHash = this.encryption.hash(phone).hash;
      const result = await this.pool.query(
        'SELECT * FROM users WHERE phone_hash = $1 AND is_active = true',
        [phoneHash]
      );
      
      if (result.rows.length === 0) return null;
      
      const user = result.rows[0];
      
      // Decrypt sensitive fields
      if (user.phone_encrypted) {
        user.phone = this.encryption.decrypt(JSON.parse(user.phone_encrypted));
      }
      if (user.email_encrypted) {
        user.email = this.encryption.decrypt(JSON.parse(user.email_encrypted));
      }
      
      return user;
    } catch (error) {
      this.logger.error('Failed to get user by phone', { error: error.message });
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve user', error);
    }
  }

  async getUserByEmail(email) {
    try {
      const emailHash = this.encryption.hash(email).hash;
      const result = await this.pool.query(
        'SELECT * FROM users WHERE email_hash = $1 AND is_active = true',
        [emailHash]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      this.logger.error('Failed to get user by email', { error: error.message });
      throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve user', error);
    }
  }

  async getAccountLockout(phoneHash) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM account_lockouts WHERE phone_hash = $1',
        [phoneHash]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      this.logger.error('Failed to get lockout info', { error: error.message });
      return null;
    }
  }

  async recordFailedLogin(phone, clientInfo = {}) {
    try {
      const phoneHash = this.encryption.hash(phone).hash;
      
      await this.pool.query(`
        INSERT INTO failed_logins (phone_hash, attempt_time, ip_address, user_agent)
        VALUES ($1, NOW(), $2, $3)
        ON CONFLICT (phone_hash) 
        DO UPDATE SET 
          attempts = failed_logins.attempts + 1,
          last_attempt = NOW(),
          ip_address = $2,
          user_agent = $3
      `, [phoneHash, clientInfo.ip || null, clientInfo.userAgent || null]);
      
      // Check if we need to lock account
      const result = await this.pool.query(
        'SELECT attempts FROM failed_logins WHERE phone_hash = $1',
        [phoneHash]
      );
      
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
      const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION) || 900000; // 15 minutes
      
      if (result.rows[0]?.attempts >= maxAttempts) {
        await this.pool.query(`
          INSERT INTO account_lockouts (phone_hash, locked_until, reason)
          VALUES ($1, NOW() + INTERVAL '${lockoutDuration} milliseconds', 'failed_login_attempts')
          ON CONFLICT (phone_hash)
          DO UPDATE SET 
            locked_until = NOW() + INTERVAL '${lockoutDuration} milliseconds',
            reason = 'failed_login_attempts'
        `, [phoneHash]);
        
        return { locked: true, attempts: result.rows[0].attempts };
      }
      
      return { locked: false, attempts: result.rows[0]?.attempts || 1 };
      
    } catch (error) {
      this.logger.error('Failed to record failed login', { error: error.message });
      return { locked: false, attempts: 0 };
    }
  }

  async clearFailedLogins(phoneHash) {
    try {
      await this.pool.query('DELETE FROM failed_logins WHERE phone_hash = $1', [phoneHash]);
      await this.pool.query('DELETE FROM account_lockouts WHERE phone_hash = $1', [phoneHash]);
    } catch (error) {
      this.logger.error('Failed to clear failed logins', { error: error.message });
    }
  }

  async isAccountLocked(phone) {
    try {
      const phoneHash = this.encryption.hash(phone).hash;
      const result = await this.pool.query(
        'SELECT locked_until FROM account_lockouts WHERE phone_hash = $1 AND locked_until > NOW()',
        [phoneHash]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error('Failed to check account lockout', { error: error.message });
      return false;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const start = Date.now();
      await this.pool.query('SELECT 1');
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = { StorageService };