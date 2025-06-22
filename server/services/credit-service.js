const { AppError, ErrorCodes } = require('../utils/errors');
const { Logger } = require('../utils/logger');

/**
 * Service for credit and overdraft operations
 */
class CreditService {
  constructor(storage, auditService, kycService) {
    this.storage = storage;
    this.auditService = auditService;
    this.kycService = kycService;
    this.logger = new Logger('CreditService');
  }
  
  /**
   * Request overdraft facility (30 days)
   */
  async requestOverdraft(userId, amount, ipAddress) {
    return await this.storage.executeTransaction(async (client) => {
      // Check KYC status
      const isVerified = await this.kycService.isVerified(userId);
      if (!isVerified) {
        throw new AppError(ErrorCodes.KYC_REQUIRED, 'KYC verification required for overdraft');
      }
      
      // Get user and wallet information
      const userResult = await client.query(
        'SELECT u.*, w.balance, w.currency FROM users u JOIN wallets w ON u.id = w.user_id WHERE u.id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found');
      }
      
      const user = userResult.rows[0];
      const currentBalance = parseFloat(user.balance);
      
      // Check if user already has active overdraft
      const existingOverdraft = await client.query(
        'SELECT * FROM credit_facilities WHERE user_id = $1 AND facility_type = $2 AND status = $3',
        [userId, 'overdraft', 'active']
      );
      
      if (existingOverdraft.rows.length > 0) {
        throw new AppError(ErrorCodes.CREDIT_EXISTS, 'Active overdraft facility already exists');
      }
      
      // Calculate overdraft limit based on account history and KYC tier
      const kycTier = await this.kycService.getKycTier(userId);
      const overdraftLimit = this.calculateOverdraftLimit(currentBalance, kycTier, amount);
      
      // Create overdraft facility
      const overdraftResult = await client.query(
        `INSERT INTO credit_facilities 
         (user_id, facility_type, amount, interest_rate, term_days, status, created_at, expires_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + INTERVAL '30 days')
         RETURNING id`,
        [userId, 'overdraft', overdraftLimit, 0.05, 30, 'active'] // 5% monthly interest
      );
      
      const facilityId = overdraftResult.rows[0].id;
      
      // Update wallet with overdraft limit
      await client.query(
        'UPDATE wallets SET overdraft_limit = $1, updated_at = NOW() WHERE user_id = $2',
        [overdraftLimit, userId]
      );
      
      // Log the action
      await this.auditService.log('overdraft_requested', userId, {
        facilityId,
        amount: overdraftLimit,
        term: 30,
        ip: ipAddress
      }, client);
      
      return {
        facilityId,
        type: 'overdraft',
        amount: overdraftLimit,
        interestRate: 0.05,
        termDays: 30,
        status: 'active'
      };
    });
  }
  
  /**
   * Request credit facility (3-12 months)
   */
  async requestCredit(userId, amount, termMonths, purpose, ipAddress) {
    return await this.storage.executeTransaction(async (client) => {
      // Validate term
      if (termMonths < 3 || termMonths > 12) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Credit term must be between 3-12 months');
      }
      
      // Check KYC status - credit requires higher verification
      const kycTier = await this.kycService.getKycTier(userId);
      if (kycTier < 2) {
        throw new AppError(ErrorCodes.KYC_REQUIRED, 'Enhanced KYC verification required for credit facility');
      }
      
      // Get user information
      const userResult = await client.query(
        'SELECT u.*, w.balance FROM users u JOIN wallets w ON u.id = w.user_id WHERE u.id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new AppError(ErrorCodes.USER_NOT_FOUND, 'User not found');
      }
      
      const user = userResult.rows[0];
      
      // Check credit limit based on KYC tier and account activity
      const creditLimit = this.calculateCreditLimit(kycTier, amount);
      const approvedAmount = Math.min(amount, creditLimit);
      
      // Calculate interest rate based on term and amount
      const interestRate = this.calculateInterestRate(termMonths, approvedAmount);
      
      // Create credit application
      const creditResult = await client.query(
        `INSERT INTO credit_facilities 
         (user_id, facility_type, amount, interest_rate, term_days, status, purpose, created_at, expires_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + INTERVAL '${termMonths} months')
         RETURNING id`,
        [userId, 'credit', approvedAmount, interestRate, termMonths * 30, 'pending', purpose]
      );
      
      const facilityId = creditResult.rows[0].id;
      
      // Log the action
      await this.auditService.log('credit_requested', userId, {
        facilityId,
        amount: approvedAmount,
        requestedAmount: amount,
        termMonths,
        purpose,
        ip: ipAddress
      }, client);
      
      return {
        facilityId,
        type: 'credit',
        requestedAmount: amount,
        approvedAmount: approvedAmount,
        interestRate,
        termMonths,
        status: 'pending',
        purpose
      };
    });
  }
  
  /**
   * Get active credit facilities for user
   */
  async getUserCreditFacilities(userId) {
    const result = await this.storage.executeQuery(
      `SELECT * FROM credit_facilities 
       WHERE user_id = $1 AND status IN ('active', 'pending') 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      type: row.facility_type,
      amount: parseFloat(row.amount),
      interestRate: parseFloat(row.interest_rate),
      termDays: row.term_days,
      status: row.status,
      purpose: row.purpose,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      usedAmount: parseFloat(row.used_amount || 0)
    }));
  }
  
  /**
   * Calculate overdraft limit
   */
  calculateOverdraftLimit(currentBalance, kycTier, requestedAmount) {
    const maxLimits = {
      1: 100000,  // 100k RWF for basic KYC
      2: 500000,  // 500k RWF for enhanced KYC
      3: 1000000  // 1M RWF for full KYC
    };
    
    const maxLimit = maxLimits[kycTier] || maxLimits[1];
    
    // Consider current balance and transaction history
    const calculatedLimit = Math.min(
      requestedAmount,
      maxLimit,
      Math.max(50000, currentBalance * 0.5) // Minimum 50k, max 50% of balance
    );
    
    return Math.floor(calculatedLimit);
  }
  
  /**
   * Calculate credit limit
   */
  calculateCreditLimit(kycTier, requestedAmount) {
    const maxLimits = {
      1: 200000,   // 200k RWF for basic KYC
      2: 1000000,  // 1M RWF for enhanced KYC
      3: 5000000   // 5M RWF for full KYC
    };
    
    return Math.min(requestedAmount, maxLimits[kycTier] || maxLimits[1]);
  }
  
  /**
   * Calculate interest rate based on term and amount
   */
  calculateInterestRate(termMonths, amount) {
    let baseRate = 0.15; // 15% annual base rate
    
    // Longer terms get slightly higher rates
    if (termMonths >= 9) baseRate += 0.02;
    else if (termMonths >= 6) baseRate += 0.01;
    
    // Higher amounts get slightly lower rates
    if (amount >= 1000000) baseRate -= 0.01;
    else if (amount >= 500000) baseRate -= 0.005;
    
    return Math.max(0.10, Math.min(0.25, baseRate)); // Between 10% and 25%
  }
  
  /**
   * Process credit repayment
   */
  async processRepayment(facilityId, amount, userId, ipAddress) {
    return await this.storage.executeTransaction(async (client) => {
      // Get facility details
      const facilityResult = await client.query(
        'SELECT * FROM credit_facilities WHERE id = $1 AND user_id = $2',
        [facilityId, userId]
      );
      
      if (facilityResult.rows.length === 0) {
        throw new AppError(ErrorCodes.CREDIT_NOT_FOUND, 'Credit facility not found');
      }
      
      const facility = facilityResult.rows[0];
      const outstandingAmount = parseFloat(facility.amount) - parseFloat(facility.paid_amount || 0);
      
      if (amount > outstandingAmount) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Payment amount exceeds outstanding balance');
      }
      
      // Update facility
      const newPaidAmount = parseFloat(facility.paid_amount || 0) + amount;
      const newStatus = newPaidAmount >= parseFloat(facility.amount) ? 'completed' : 'active';
      
      await client.query(
        'UPDATE credit_facilities SET paid_amount = $1, status = $2, updated_at = NOW() WHERE id = $3',
        [newPaidAmount, newStatus, facilityId]
      );
      
      // Create repayment record
      await client.query(
        `INSERT INTO credit_repayments (facility_id, amount, payment_date, created_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [facilityId, amount]
      );
      
      // Log the repayment
      await this.auditService.log('credit_repayment', userId, {
        facilityId,
        amount,
        outstandingAmount: outstandingAmount - amount,
        status: newStatus,
        ip: ipAddress
      }, client);
      
      return {
        facilityId,
        paymentAmount: amount,
        outstandingAmount: outstandingAmount - amount,
        status: newStatus
      };
    });
  }
}

module.exports = { CreditService };