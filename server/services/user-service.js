const bcrypt = require('bcryptjs');
const { storage } = require('../storage-supabase');
const { auditLog, auditActions } = require('./audit-service');
const { validatePassword } = require('../utils/security');

class UserService {
  constructor() {
    this.storage = storage;
  }
  
  async createUser(userData, clientInfo = {}) {
    return await this.storage.executeTransaction(async (client) => {
      // Validate user data
      if (!validatePassword(userData.password)) {
        throw new Error('Password does not meet security requirements');
      }
      
      // Hash password with higher cost factor for production
      const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      // Create user record
      const userResult = await client.query(
        `INSERT INTO users (first_name, last_name, phone, email, password_hash, kyc_status, is_active, preferred_language, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
        [
          userData.firstName,
          userData.lastName,
          userData.phone,
          userData.email || `${userData.phone}@centrika.rw`,
          hashedPassword,
          'pending',
          true,
          userData.preferredLanguage || 'en'
        ]
      );
      
      const user = userResult.rows[0];
      
      // Create wallet for user
      const walletResult = await client.query(
        `INSERT INTO wallets (user_id, balance, currency, kyc_level, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
        [user.id, '1000.00', 'RWF', 1, true]
      );
      
      // Log the action
      await auditLog(auditActions.USER_CREATED, user.id, {
        email: user.email,
        phone: user.phone,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent
      }, client);
      
      return {
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          email: user.email,
          kycStatus: user.kyc_status
        },
        wallet: walletResult.rows[0]
      };
    });
  }

  async authenticateUser(phone, password, clientInfo = {}) {
    const user = await this.storage.getUserByPhone(phone);
    
    if (!user) {
      // Log failed attempt
      await auditLog(auditActions.SECURITY_VIOLATION, null, {
        action: 'login_attempt_invalid_phone',
        phone,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent
      });
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      // Log failed attempt
      await auditLog(auditActions.SECURITY_VIOLATION, user.id, {
        action: 'login_attempt_invalid_password',
        phone,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent
      });
      return null;
    }

    // Log successful login
    await auditLog(auditActions.USER_LOGIN, user.id, {
      phone,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent
    });

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      email: user.email,
      kycStatus: user.kyc_status
    };
  }

  async changePassword(userId, currentPassword, newPassword, clientInfo = {}) {
    return await this.storage.executeTransaction(async (client) => {
      // Get current user
      const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        await auditLog(auditActions.SECURITY_VIOLATION, userId, {
          action: 'password_change_invalid_current',
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent
        }, client);
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      if (!validatePassword(newPassword)) {
        throw new Error('New password does not meet security requirements');
      }

      // Hash new password
      const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, userId]
      );

      // Log password change
      await auditLog(auditActions.PASSWORD_CHANGED, userId, {
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent
      }, client);

      return { success: true };
    });
  }
}

const userService = new UserService();
module.exports = { UserService, userService };