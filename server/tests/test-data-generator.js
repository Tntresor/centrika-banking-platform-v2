const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

/**
 * Test data generator for automated testing
 */
class TestDataGenerator {
  constructor(storage, auditService) {
    this.storage = storage;
    this.auditService = auditService;
  }

  /**
   * Generate test users with wallets and transactions
   */
  async generateTestData(userCount = 10, transactionCount = 100) {
    console.log(`Generating ${userCount} test users with ${transactionCount} transactions...`);
    
    const users = [];
    const wallets = [];
    const transactions = [];

    try {
      // Generate users
      console.log('Creating test users...');
      for (let i = 0; i < userCount; i++) {
        const user = await this.createTestUser(i);
        users.push(user);
        
        // Create wallet for each user
        const wallet = await this.createTestWallet(user.id);
        wallets.push(wallet);
      }

      // Generate transactions between users
      console.log('Creating test transactions...');
      for (let i = 0; i < transactionCount; i++) {
        const transaction = await this.createTestTransaction(wallets);
        if (transaction) transactions.push(transaction);
      }

      // Generate some KYC documents
      console.log('Creating KYC documents...');
      for (let i = 0; i < Math.floor(userCount * 0.7); i++) {
        await this.createTestKYCDocument(users[i].id);
      }

      console.log('Test data generation completed!');
      return {
        users: users.length,
        wallets: wallets.length,
        transactions: transactions.length,
        summary: {
          totalUsers: users.length,
          verifiedUsers: Math.floor(userCount * 0.7),
          totalTransactions: transactions.length,
          totalVolume: transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)
        }
      };

    } catch (error) {
      console.error('Error generating test data:', error);
      throw error;
    }
  }

  /**
   * Create a test user
   */
  async createTestUser(index) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const phone = `078${faker.string.numeric(7)}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.centrika.rw`;
    const password = await bcrypt.hash('TestPassword123!', 12);

    const result = await this.storage.executeQuery(
      `INSERT INTO users (first_name, last_name, phone, email, password_hash, kyc_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        firstName,
        lastName,
        phone,
        email,
        password,
        faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
        faker.date.past({ years: 2 })
      ]
    );

    return result.rows[0];
  }

  /**
   * Create a test wallet
   */
  async createTestWallet(userId) {
    const initialBalance = faker.number.float({ min: 1000, max: 500000, precision: 0.01 });
    
    const result = await this.storage.executeQuery(
      `INSERT INTO wallets (user_id, balance, currency, kyc_level, created_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        userId,
        initialBalance,
        'RWF',
        faker.helpers.arrayElement([1, 2, 3]),
        faker.date.past({ years: 2 })
      ]
    );

    return result.rows[0];
  }

  /**
   * Create a test transaction
   */
  async createTestTransaction(wallets) {
    if (wallets.length < 2) return null;

    const fromWallet = faker.helpers.arrayElement(wallets);
    const toWallet = faker.helpers.arrayElement(wallets.filter(w => w.id !== fromWallet.id));
    
    const amount = faker.number.float({ min: 500, max: 50000, precision: 0.01 });
    const transactionType = faker.helpers.arrayElement(['transfer', 'payment', 'withdrawal', 'deposit']);
    const status = faker.helpers.weightedArrayElement([
      { weight: 85, value: 'completed' },
      { weight: 10, value: 'pending' },
      { weight: 5, value: 'failed' }
    ]);

    const result = await this.storage.executeQuery(
      `INSERT INTO transactions (
        wallet_id, amount, type, 
        status, description, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        fromWallet.id,
        amount,
        transactionType,
        status,
        faker.finance.transactionDescription(),
        faker.date.past({ years: 1 })
      ]
    );

    // Update wallet balances for completed transactions
    if (status === 'completed') {
      await this.storage.executeQuery(
        'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
        [amount, fromWallet.id]
      );
      
      await this.storage.executeQuery(
        'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
        [amount, toWallet.id]
      );
    }

    return result.rows[0];
  }

  /**
   * Create test KYC document
   */
  async createTestKYCDocument(userId) {
    const documentType = faker.helpers.arrayElement(['id_card', 'passport', 'driving_license']);
    const status = faker.helpers.weightedArrayElement([
      { weight: 70, value: 'approved' },
      { weight: 20, value: 'pending' },
      { weight: 10, value: 'rejected' }
    ]);

    const result = await this.storage.executeQuery(
      `INSERT INTO kyc_documents (
        user_id, document_type, status, document_data, created_at
      ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        userId,
        documentType,
        status,
        JSON.stringify({
          documentNumber: faker.string.alphanumeric(10),
          issueDate: faker.date.past({ years: 5 }),
          expiryDate: faker.date.future({ years: 5 }),
          verificationScore: faker.number.int({ min: 70, max: 99 })
        }),
        faker.date.past({ years: 1 })
      ]
    );

    // Update user KYC status if approved
    if (status === 'approved') {
      await this.storage.executeQuery(
        'UPDATE users SET kyc_status = $1 WHERE id = $2',
        ['verified', userId]
      );
    }

    return result.rows[0];
  }

  /**
   * Generate credit facilities for some users
   */
  async generateCreditFacilities(userIds) {
    console.log('Creating credit facilities...');
    
    for (const userId of userIds.slice(0, Math.floor(userIds.length * 0.3))) {
      const facilityType = faker.helpers.arrayElement(['overdraft', 'credit']);
      const amount = facilityType === 'overdraft' 
        ? faker.number.float({ min: 50000, max: 500000, precision: 0.01 })
        : faker.number.float({ min: 100000, max: 2000000, precision: 0.01 });
      
      const termDays = facilityType === 'overdraft' ? 30 : faker.number.int({ min: 90, max: 365 });
      const interestRate = faker.number.float({ min: 0.08, max: 0.25, precision: 0.001 });

      await this.storage.executeQuery(
        `INSERT INTO credit_facilities (
          user_id, facility_type, amount, interest_rate, term_days, status, created_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          facilityType,
          amount,
          interestRate,
          termDays,
          faker.helpers.arrayElement(['active', 'pending', 'completed']),
          faker.date.past({ years: 1 }),
          faker.date.future({ years: 1 })
        ]
      );
    }
  }

  /**
   * Clean up all test data
   */
  async cleanupTestData() {
    console.log('Cleaning up test data...');
    
    const tables = [
      'credit_repayments',
      'credit_facilities',
      'transactions',
      'kyc_documents',
      'wallets',
      'users'
    ];

    for (const table of tables) {
      if (table === 'users') {
        // Only delete test users
        await this.storage.executeQuery(
          `DELETE FROM ${table} WHERE email LIKE '%@test.centrika.rw'`
        );
      } else {
        // For other tables, delete based on user relationship
        await this.storage.executeQuery(
          `DELETE FROM ${table} WHERE user_id IN (
            SELECT id FROM users WHERE email LIKE '%@test.centrika.rw'
          )`
        );
      }
    }

    console.log('Test data cleanup completed');
  }
}

module.exports = { TestDataGenerator };