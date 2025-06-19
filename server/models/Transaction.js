class Transaction {
  constructor(transactionData) {
    this.id = transactionData.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Basic transaction details
    this.type = transactionData.type; // deposit, withdrawal, transfer, payment
    this.subType = transactionData.subType; // momo_deposit, p2p, qr_payment, card_payment, etc.
    this.status = transactionData.status || 'pending'; // pending, completed, failed, cancelled, reversed
    
    // Parties involved
    this.senderId = transactionData.senderId || null; // User who initiates the transaction
    this.recipientId = transactionData.recipientId || null; // User who receives the transaction
    this.merchantId = transactionData.merchantId || null; // For merchant payments
    
    // Financial details
    this.amount = transactionData.amount;
    this.currency = transactionData.currency || 'RWF';
    this.fee = transactionData.fee || 0;
    this.totalAmount = transactionData.totalAmount || (this.amount + this.fee);
    
    // Exchange rate info (for multi-currency transactions)
    this.exchangeRate = transactionData.exchangeRate || null;
    this.sourceCurrency = transactionData.sourceCurrency || this.currency;
    this.targetCurrency = transactionData.targetCurrency || this.currency;
    
    // Description and reference
    this.description = transactionData.description || '';
    this.note = transactionData.note || null; // User-provided note
    this.reference = transactionData.reference || this.generateReference();
    this.externalReference = transactionData.externalReference || null; // External system reference
    
    // Routing and processing
    this.processor = transactionData.processor || null; // momo, card_network, internal
    this.gateway = transactionData.gateway || null; // Specific gateway used
    this.routingInfo = transactionData.routingInfo || {};
    
    // Security and compliance
    this.riskScore = transactionData.riskScore || 0;
    this.fraudFlags = transactionData.fraudFlags || [];
    this.complianceChecks = transactionData.complianceChecks || [];
    this.amlStatus = transactionData.amlStatus || 'cleared'; // cleared, flagged, blocked
    
    // Timestamps
    this.createdAt = transactionData.createdAt || new Date();
    this.updatedAt = transactionData.updatedAt || new Date();
    this.scheduledAt = transactionData.scheduledAt || null; // For scheduled transactions
    this.processedAt = transactionData.processedAt || null;
    this.completedAt = transactionData.completedAt || null;
    this.failedAt = transactionData.failedAt || null;
    this.cancelledAt = transactionData.cancelledAt || null;
    this.reversedAt = transactionData.reversedAt || null;
    
    // Error handling
    this.errorCode = transactionData.errorCode || null;
    this.errorMessage = transactionData.errorMessage || null;
    this.failureReason = transactionData.failureReason || null;
    this.retryCount = transactionData.retryCount || 0;
    this.maxRetries = transactionData.maxRetries || 3;
    
    // Location and device info
    this.location = transactionData.location || null; // GPS coordinates
    this.deviceInfo = transactionData.deviceInfo || null;
    this.ipAddress = transactionData.ipAddress || null;
    this.userAgent = transactionData.userAgent || null;
    
    // Additional metadata
    this.metadata = transactionData.metadata || {};
    this.tags = transactionData.tags || [];
    this.category = transactionData.category || null; // food, transport, shopping, etc.
    
    // Approval workflow
    this.requiresApproval = transactionData.requiresApproval || false;
    this.approvedBy = transactionData.approvedBy || null;
    this.approvedAt = transactionData.approvedAt || null;
    this.rejectedBy = transactionData.rejectedBy || null;
    this.rejectedAt = transactionData.rejectedAt || null;
    this.rejectionReason = transactionData.rejectionReason || null;
    
    // Batch processing
    this.batchId = transactionData.batchId || null;
    this.batchSequence = transactionData.batchSequence || null;
    
    // Reconciliation
    this.reconciledAt = transactionData.reconciledAt || null;
    this.reconciliationReference = transactionData.reconciliationReference || null;
    
    // Parent/child relationships
    this.parentTransactionId = transactionData.parentTransactionId || null;
    this.childTransactionIds = transactionData.childTransactionIds || [];
    
    // Notification status
    this.notificationsSent = transactionData.notificationsSent || [];
    this.notificationStatus = transactionData.notificationStatus || 'pending';
    
    // Regulatory reporting
    this.reportedToBNR = transactionData.reportedToBNR || false;
    this.bnrReportDate = transactionData.bnrReportDate || null;
    this.bnrReference = transactionData.bnrReference || null;
  }

  // Generate unique reference number
  generateReference() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `CTK${timestamp.slice(-8)}${random}`;
  }

  // Validate transaction data
  validate() {
    const errors = [];

    // Required fields
    if (!this.type) {
      errors.push('Transaction type is required');
    }

    if (!this.amount || this.amount <= 0) {
      errors.push('Valid amount is required');
    }

    if (!this.currency) {
      errors.push('Currency is required');
    }

    // Business logic validation
    if (this.type === 'transfer' && (!this.senderId || !this.recipientId)) {
      errors.push('Transfer requires both sender and recipient');
    }

    if (this.type === 'payment' && !this.senderId) {
      errors.push('Payment requires a sender');
    }

    if (this.type === 'deposit' && !this.recipientId) {
      errors.push('Deposit requires a recipient');
    }

    if (this.type === 'withdrawal' && !this.senderId) {
      errors.push('Withdrawal requires a sender');
    }

    // Amount limits (BNR compliance)
    if (this.amount > 1000000) { // 1M RWF single transaction limit
      errors.push('Amount exceeds single transaction limit');
    }

    // Currency validation
    const allowedCurrencies = ['RWF', 'USD', 'EUR'];
    if (!allowedCurrencies.includes(this.currency)) {
      errors.push('Unsupported currency');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Update transaction status
  updateStatus(newStatus, additionalData = {}) {
    const oldStatus = this.status;
    this.status = newStatus;
    this.updatedAt = new Date();

    // Set appropriate timestamps
    switch (newStatus) {
      case 'processed':
        this.processedAt = new Date();
        break;
      case 'completed':
        this.completedAt = new Date();
        break;
      case 'failed':
        this.failedAt = new Date();
        if (additionalData.errorCode) this.errorCode = additionalData.errorCode;
        if (additionalData.errorMessage) this.errorMessage = additionalData.errorMessage;
        if (additionalData.failureReason) this.failureReason = additionalData.failureReason;
        break;
      case 'cancelled':
        this.cancelledAt = new Date();
        break;
      case 'reversed':
        this.reversedAt = new Date();
        break;
    }

    // Add status change to metadata
    if (!this.metadata.statusHistory) {
      this.metadata.statusHistory = [];
    }

    this.metadata.statusHistory.push({
      from: oldStatus,
      to: newStatus,
      timestamp: new Date(),
      ...additionalData,
    });

    return this;
  }

  // Check if transaction can be cancelled
  canBeCancelled() {
    return this.status === 'pending' && !this.processedAt;
  }

  // Check if transaction can be reversed
  canBeReversed() {
    return this.status === 'completed' && 
           this.type !== 'deposit' && // Can't reverse external deposits
           (new Date() - this.completedAt) < (24 * 60 * 60 * 1000); // Within 24 hours
  }

  // Check if transaction requires manual approval
  requiresManualApproval() {
    if (this.requiresApproval) return true;
    
    // High-value transactions
    if (this.amount >= 500000) return true; // 500k RWF
    
    // High-risk transactions
    if (this.riskScore >= 70) return true;
    
    // Flagged transactions
    if (this.fraudFlags.length > 0) return true;
    
    // Cross-border transactions
    if (this.currency !== 'RWF') return true;
    
    return false;
  }

  // Calculate risk score
  calculateRiskScore() {
    let score = 0;

    // Amount-based risk
    if (this.amount >= 500000) score += 20;
    else if (this.amount >= 250000) score += 10;
    else if (this.amount >= 100000) score += 5;

    // Time-based risk (off-hours transactions)
    const hour = this.createdAt.getHours();
    if (hour < 6 || hour > 22) score += 10;

    // Frequency risk (would need transaction history)
    // This would be calculated based on user's recent transaction patterns

    // Location risk (if available)
    if (this.location && this.metadata.unusualLocation) {
      score += 15;
    }

    // Device risk
    if (this.metadata.newDevice) score += 10;

    // Cross-border risk
    if (this.currency !== 'RWF') score += 25;

    this.riskScore = Math.min(score, 100); // Cap at 100
    return this.riskScore;
  }

  // Add fraud flag
  addFraudFlag(flagType, reason, severity = 'medium') {
    const flag = {
      type: flagType,
      reason,
      severity, // low, medium, high, critical
      timestamp: new Date(),
      id: `flag_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    };

    this.fraudFlags.push(flag);
    this.calculateRiskScore();
    
    // Auto-block critical fraud flags
    if (severity === 'critical') {
      this.updateStatus('blocked', { reason: 'Critical fraud flag detected' });
    }

    return flag;
  }

  // Clear fraud flags
  clearFraudFlags(clearedBy, reason) {
    this.fraudFlags = this.fraudFlags.map(flag => ({
      ...flag,
      cleared: true,
      clearedBy,
      clearedAt: new Date(),
      clearanceReason: reason,
    }));

    this.calculateRiskScore();
    return this;
  }

  // Add compliance check result
  addComplianceCheck(checkType, result, details = {}) {
    const check = {
      type: checkType, // aml, sanctions, pep, etc.
      result, // passed, failed, manual_review
      details,
      timestamp: new Date(),
      id: `check_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    };

    this.complianceChecks.push(check);

    // Update AML status based on checks
    if (result === 'failed') {
      this.amlStatus = 'blocked';
    } else if (result === 'manual_review') {
      this.amlStatus = 'flagged';
    }

    return check;
  }

  // Check if all compliance checks passed
  isComplianceCleared() {
    if (this.complianceChecks.length === 0) return false;
    
    return this.complianceChecks.every(check => 
      check.result === 'passed' || 
      (check.result === 'manual_review' && check.manuallyApproved)
    );
  }

  // Get transaction fees breakdown
  getFeesBreakdown() {
    return {
      processingFee: this.metadata.processingFee || 0,
      networkFee: this.metadata.networkFee || 0,
      exchangeFee: this.metadata.exchangeFee || 0,
      complianceFee: this.metadata.complianceFee || 0,
      totalFee: this.fee,
    };
  }

  // Format amount for display
  formatAmount(includeSymbol = true) {
    const symbol = this.currency === 'RWF' ? 'RWF' : this.currency;
    const formatted = this.amount.toLocaleString();
    return includeSymbol ? `${formatted} ${symbol}` : formatted;
  }

  // Get human-readable status
  getStatusDisplay() {
    const statusMap = {
      pending: 'Pending',
      processed: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
      reversed: 'Reversed',
      blocked: 'Blocked',
    };

    return statusMap[this.status] || this.status;
  }

  // Get transaction direction for a user
  getDirection(userId) {
    if (this.senderId === userId) return 'outgoing';
    if (this.recipientId === userId) return 'incoming';
    return 'neutral';
  }

  // Check if transaction is expired
  isExpired() {
    if (!this.metadata.expiresAt) return false;
    return new Date() > new Date(this.metadata.expiresAt);
  }

  // Retry failed transaction
  retry() {
    if (this.status !== 'failed') {
      throw new Error('Only failed transactions can be retried');
    }

    if (this.retryCount >= this.maxRetries) {
      throw new Error('Maximum retry attempts exceeded');
    }

    this.retryCount += 1;
    this.status = 'pending';
    this.errorCode = null;
    this.errorMessage = null;
    this.failureReason = null;
    this.failedAt = null;
    this.updatedAt = new Date();

    return this;
  }

  // Convert to safe object (remove sensitive data)
  toSafeObject() {
    const safe = { ...this };
    
    // Remove sensitive metadata
    if (safe.metadata) {
      delete safe.metadata.internalNotes;
      delete safe.metadata.systemFlags;
      delete safe.metadata.debugInfo;
    }

    // Remove internal fields
    delete safe.fraudFlags;
    delete safe.complianceChecks;
    
    return safe;
  }

  // Convert to audit log format
  toAuditLog() {
    return {
      transactionId: this.id,
      type: this.type,
      subType: this.subType,
      status: this.status,
      amount: this.amount,
      currency: this.currency,
      senderId: this.senderId,
      recipientId: this.recipientId,
      timestamp: this.createdAt,
      reference: this.reference,
      riskScore: this.riskScore,
      complianceStatus: this.amlStatus,
    };
  }

  // Convert to BNR reporting format
  toBNRReport() {
    return {
      reference: this.reference,
      date: this.createdAt.toISOString().split('T')[0],
      type: this.type,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      senderId: this.senderId,
      recipientId: this.recipientId,
      processingTime: this.completedAt ? 
        (this.completedAt - this.createdAt) / 1000 : null,
      complianceStatus: this.amlStatus,
    };
  }

  // Static method to create from external data
  static fromExternalData(externalData, mappingConfig) {
    const mapped = {};
    
    Object.keys(mappingConfig).forEach(internalField => {
      const externalField = mappingConfig[internalField];
      if (externalData[externalField] !== undefined) {
        mapped[internalField] = externalData[externalField];
      }
    });

    return new Transaction(mapped);
  }

  // Static method to validate transaction limits
  static validateLimits(amount, userLimits, transactionType) {
    const errors = [];

    // Single transaction limit
    if (amount > userLimits.singleTransactionLimit) {
      errors.push(`Amount exceeds single transaction limit: ${userLimits.singleTransactionLimit}`);
    }

    // BNR regulatory limits
    if (amount > 1000000) {
      errors.push('Amount exceeds regulatory single transaction limit: 1,000,000 RWF');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = Transaction;
