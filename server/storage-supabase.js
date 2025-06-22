const { Client } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

class DatabaseStorage {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    if (!this.connected || !this.client) {
      try {
        // Close existing connection if any
        if (this.client) {
          try {
            await this.client.end();
          } catch (e) {
            // Ignore close errors
          }
        }
        
        this.client = new Client({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
          query_timeout: 10000
        });
        
        // Handle connection errors
        this.client.on('error', (err) => {
          console.error('Database connection error:', err.message);
          this.connected = false;
          this.client = null;
        });
        
        this.client.on('end', () => {
          console.log('Database connection ended');
          this.connected = false;
          this.client = null;
        });
        
        await this.client.connect();
        this.connected = true;
        console.log('Connected to Supabase database');
      } catch (error) {
        console.error('Failed to connect to database:', error.message);
        this.connected = false;
        this.client = null;
        throw error;
      }
    }
  }

  async executeQuery(query, params = []) {
    let retries = 3;
    while (retries > 0) {
      try {
        await this.connect();
        if (!this.client || !this.connected) {
          throw new Error('Database not connected');
        }
        return await this.client.query(query, params);
      } catch (error) {
        console.error(`Database query error (${retries} retries left):`, error.message);
        this.connected = false;
        this.client = null;
        retries--;
        
        if (retries === 0) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // User operations
  async getUser(id) {
    try {
      const result = await this.executeQuery('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Database error in getUser:', error);
      return undefined;
    }
  }

  async getUserByPhone(phone) {
    try {
      const result = await this.executeQuery('SELECT * FROM users WHERE phone = $1', [phone]);
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Database error in getUserByPhone:', error);
      return undefined;
    }
  }

  async createUser(insertUser) {
    try {
      const result = await this.executeQuery(
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
    } catch (error) {
      console.error('Database error in createUser:', error);
      throw error;
    }
  }

  async updateUser(id, updates) {
    await this.connect();
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          const dbKey = key === 'firstName' ? 'first_name' : 
                       key === 'lastName' ? 'last_name' :
                       key === 'kycStatus' ? 'kyc_status' :
                       key === 'isActive' ? 'is_active' :
                       key === 'preferredLanguage' ? 'preferred_language' :
                       key === 'passwordHash' ? 'password_hash' : key;
          
          fields.push(`${dbKey} = $${paramIndex}`);
          values.push(updates[key]);
          paramIndex++;
        }
      });

      if (fields.length === 0) return await this.getUser(id);

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await this.client.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Database error in updateUser:', error);
      throw error;
    }
  }

  // Wallet operations
  async getWallet(userId) {
    await this.connect();
    try {
      const result = await this.client.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Database error in getWallet:', error);
      return undefined;
    }
  }

  async createWallet(insertWallet) {
    await this.connect();
    try {
      const result = await this.client.query(
        `INSERT INTO wallets (user_id, balance, currency, kyc_level, is_active)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          insertWallet.userId,
          insertWallet.balance || '0.00',
          insertWallet.currency || 'RWF',
          insertWallet.kycLevel || 'basic',
          insertWallet.isActive !== false
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Database error in createWallet:', error);
      throw error;
    }
  }

  async updateWalletBalance(walletId, amount) {
    await this.connect();
    try {
      const result = await this.client.query(
        'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [amount, walletId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Database error in updateWalletBalance:', error);
      throw error;
    }
  }

  // Transaction operations
  async createTransaction(insertTransaction) {
    await this.connect();
    try {
      const result = await this.client.query(
        `INSERT INTO transactions (from_wallet_id, to_wallet_id, amount, currency, type, status, reference, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          insertTransaction.fromWalletId || null,
          insertTransaction.toWalletId || null,
          insertTransaction.amount,
          insertTransaction.currency || 'RWF',
          insertTransaction.type,
          insertTransaction.status || 'pending',
          insertTransaction.reference,
          insertTransaction.description
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Database error in createTransaction:', error);
      throw error;
    }
  }

  async getTransactions(walletId, limit = 50) {
    await this.connect();
    try {
      const result = await this.client.query(
        'SELECT * FROM transactions WHERE from_wallet_id = $1 OR to_wallet_id = $1 ORDER BY created_at DESC LIMIT $2',
        [walletId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Database error in getTransactions:', error);
      return [];
    }
  }

  async getTransaction(id) {
    await this.connect();
    try {
      const result = await this.client.query('SELECT * FROM transactions WHERE id = $1', [id]);
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Database error in getTransaction:', error);
      return undefined;
    }
  }

  async updateTransaction(id, updates) {
    await this.connect();
    try {
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

      if (fields.length === 0) return await this.getTransaction(id);

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await this.client.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Database error in updateTransaction:', error);
      throw error;
    }
  }

  // Simplified placeholder methods for other operations
  async createCard(insertCard) { return { id: 1, ...insertCard }; }
  async getUserCards(userId) { return []; }
  async getCard(id) { return undefined; }
  async createKYCDocument(insertKYC) { return { id: 1, ...insertKYC }; }
  async getKYCDocuments(userId) { return []; }
  async updateKYCDocument(id, updates) { return { id, ...updates }; }
  async getPendingKYCDocuments() { return []; }
  async getAdminUser(email) { return undefined; }
  async createAdminUser(insertAdmin) { return { id: 1, ...insertAdmin }; }
  async createAuditLog(insertAudit) { return { id: 1, ...insertAudit }; }
  async getAuditLogs(limit = 100, offset = 0) { return []; }
  async createNotification(insertNotification) { return { id: 1, ...insertNotification }; }
  async getUserNotifications(userId) { return []; }
  async markNotificationAsRead(id) { return; }
  async getDailyMetrics(date) { return {}; }
  async getTransactionsByDateRange(startDate, endDate) { return []; }
  async searchUsers(query, status) { return []; }
}

const storage = new DatabaseStorage();
module.exports = { storage };

// Add this to your database connection code
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit - let the app handle it gracefully
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - let the app handle it gracefully
});