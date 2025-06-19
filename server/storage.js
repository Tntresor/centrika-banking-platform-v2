const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq, desc, and, gte, lte, like, or } = require('drizzle-orm');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Define database schema (simplified for CommonJS)
const users = {
  id: 'id',
  phone: 'phone',
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  passwordHash: 'password_hash',
  kycStatus: 'kyc_status',
  isActive: 'is_active',
  preferredLanguage: 'preferred_language',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

const wallets = {
  id: 'id',
  userId: 'user_id',
  balance: 'balance',
  currency: 'currency',
  isActive: 'is_active',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

const transactions = {
  id: 'id',
  walletId: 'wallet_id',
  type: 'type',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  reference: 'reference',
  description: 'description',
  recipientPhone: 'recipient_phone',
  isIncoming: 'is_incoming',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

const cards = {
  id: 'id',
  userId: 'user_id',
  maskedPan: 'masked_pan',
  cardType: 'card_type',
  provider: 'provider',
  expiryDate: 'expiry_date',
  isActive: 'is_active',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

const kycDocuments = {
  id: 'id',
  userId: 'user_id',
  documentType: 'document_type',
  documentUrl: 'document_url',
  verificationStatus: 'verification_status',
  verificationScore: 'verification_score',
  reviewNotes: 'review_notes',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

const adminUsers = {
  id: 'id',
  email: 'email',
  passwordHash: 'password_hash',
  role: 'role',
  isActive: 'is_active',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

class DatabaseStorage {
  constructor() {
    this.db = drizzle(pool);
  }

  async getUser(id) {
    const result = await this.db.execute(`SELECT * FROM users WHERE id = $1`, [id]);
    return result.rows[0] || undefined;
  }

  async getUserByPhone(phone) {
    const result = await this.db.execute(`SELECT * FROM users WHERE phone = $1`, [phone]);
    return result.rows[0] || undefined;
  }

  async createUser(insertUser) {
    const result = await this.db.execute(
      `INSERT INTO users (phone, first_name, last_name, email, password_hash, kyc_status, is_active, preferred_language)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        insertUser.phone,
        insertUser.firstName,
        insertUser.lastName,
        insertUser.email,
        insertUser.passwordHash,
        insertUser.kycStatus || 'pending',
        insertUser.isActive !== false,
        insertUser.preferredLanguage || 'en'
      ]
    );
    return result.rows[0];
  }

  async updateUser(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.getUser(id);
    }

    values.push(id);
    const result = await this.db.execute(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async getWallet(userId) {
    const result = await this.db.execute(`SELECT * FROM wallets WHERE user_id = $1`, [userId]);
    return result.rows[0] || undefined;
  }

  async createWallet(insertWallet) {
    const result = await this.db.execute(
      `INSERT INTO wallets (user_id, balance, currency, is_active)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        insertWallet.userId,
        insertWallet.balance || '0.00',
        insertWallet.currency || 'RWF',
        insertWallet.isActive !== false
      ]
    );
    return result.rows[0];
  }

  async updateWalletBalance(walletId, amount) {
    const result = await this.db.execute(
      `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [amount, walletId]
    );
    return result.rows[0];
  }

  async createTransaction(insertTransaction) {
    const result = await this.db.execute(
      `INSERT INTO transactions (wallet_id, type, amount, currency, status, reference, description, recipient_phone, is_incoming)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        insertTransaction.walletId,
        insertTransaction.type,
        insertTransaction.amount,
        insertTransaction.currency || 'RWF',
        insertTransaction.status || 'pending',
        insertTransaction.reference,
        insertTransaction.description,
        insertTransaction.recipientPhone,
        insertTransaction.isIncoming || false
      ]
    );
    return result.rows[0];
  }

  async getTransactions(walletId, limit = 50) {
    const result = await this.db.execute(
      `SELECT * FROM transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [walletId, limit]
    );
    return result.rows;
  }

  async getTransaction(id) {
    const result = await this.db.execute(`SELECT * FROM transactions WHERE id = $1`, [id]);
    return result.rows[0] || undefined;
  }

  async updateTransaction(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.getTransaction(id);
    }

    values.push(id);
    const result = await this.db.execute(
      `UPDATE transactions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async createCard(insertCard) {
    const result = await this.db.execute(
      `INSERT INTO cards (user_id, masked_pan, card_type, provider, expiry_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        insertCard.userId,
        insertCard.maskedPan,
        insertCard.cardType || 'virtual',
        insertCard.provider || 'unionpay',
        insertCard.expiryDate,
        insertCard.isActive !== false
      ]
    );
    return result.rows[0];
  }

  async getUserCards(userId) {
    const result = await this.db.execute(`SELECT * FROM cards WHERE user_id = $1`, [userId]);
    return result.rows;
  }

  async getCard(id) {
    const result = await this.db.execute(`SELECT * FROM cards WHERE id = $1`, [id]);
    return result.rows[0] || undefined;
  }

  async createKYCDocument(insertKYC) {
    const result = await this.db.execute(
      `INSERT INTO kyc_documents (user_id, document_type, document_url, verification_status, verification_score, review_notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        insertKYC.userId,
        insertKYC.documentType,
        insertKYC.documentUrl,
        insertKYC.verificationStatus || 'pending',
        insertKYC.verificationScore || 0.00,
        insertKYC.reviewNotes
      ]
    );
    return result.rows[0];
  }

  async getKYCDocuments(userId) {
    const result = await this.db.execute(`SELECT * FROM kyc_documents WHERE user_id = $1`, [userId]);
    return result.rows;
  }

  async updateKYCDocument(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.getKYCDocument(id);
    }

    values.push(id);
    const result = await this.db.execute(
      `UPDATE kyc_documents SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async getPendingKYCDocuments() {
    const result = await this.db.execute(`SELECT * FROM kyc_documents WHERE verification_status = 'pending'`);
    return result.rows;
  }

  async getAdminUser(email) {
    const result = await this.db.execute(`SELECT * FROM admin_users WHERE email = $1`, [email]);
    return result.rows[0] || undefined;
  }

  async createAdminUser(insertAdmin) {
    const result = await this.db.execute(
      `INSERT INTO admin_users (email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        insertAdmin.email,
        insertAdmin.passwordHash,
        insertAdmin.role || 'admin',
        insertAdmin.isActive !== false
      ]
    );
    return result.rows[0];
  }

  async createAuditLog(insertAudit) {
    const result = await this.db.execute(
      `INSERT INTO audit_logs (user_id, admin_user_id, action, entity, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        insertAudit.userId,
        insertAudit.adminUserId,
        insertAudit.action,
        insertAudit.entity,
        insertAudit.entityId,
        JSON.stringify(insertAudit.oldValues),
        JSON.stringify(insertAudit.newValues),
        insertAudit.ipAddress,
        insertAudit.userAgent
      ]
    );
    return result.rows[0];
  }

  async getAuditLogs(limit = 100, offset = 0) {
    const result = await this.db.execute(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async createNotification(insertNotification) {
    const result = await this.db.execute(
      `INSERT INTO notifications (user_id, title, message, type, is_read)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        insertNotification.userId,
        insertNotification.title,
        insertNotification.message,
        insertNotification.type || 'info',
        insertNotification.isRead || false
      ]
    );
    return result.rows[0];
  }

  async getUserNotifications(userId) {
    const result = await this.db.execute(`SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
    return result.rows;
  }

  async markNotificationAsRead(id) {
    await this.db.execute(`UPDATE notifications SET is_read = true WHERE id = $1`, [id]);
  }

  async getDailyMetrics(date) {
    const result = await this.db.execute(`
      SELECT 
        COUNT(CASE WHEN DATE(created_at) = $1 THEN 1 END) as daily_signups,
        COUNT(CASE WHEN kyc_status = 'approved' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as successful_kyc_rate,
        (SELECT COUNT(*) FROM transactions WHERE DATE(created_at) = $1) as transaction_count,
        (SELECT COALESCE(SUM(balance::numeric), 0) FROM wallets) as total_ledger_balance,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
      FROM users
    `, [date]);
    return result.rows[0] || {};
  }

  async getTransactionsByDateRange(startDate, endDate) {
    const result = await this.db.execute(
      `SELECT * FROM transactions WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at DESC`,
      [startDate, endDate]
    );
    return result.rows;
  }

  async searchUsers(query, status) {
    let sql = `SELECT * FROM users WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)`;
    const params = [`%${query}%`];
    
    if (status) {
      sql += ` AND kyc_status = $2`;
      params.push(status);
    }
    
    sql += ` ORDER BY created_at DESC`;
    
    const result = await this.db.execute(sql, params);
    return result.rows;
  }
}

const storage = new DatabaseStorage();

module.exports = { storage, DatabaseStorage };