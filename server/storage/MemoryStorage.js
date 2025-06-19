// In-memory storage implementation for development and testing
// In production, this would be replaced with a proper database

class MemoryStorage {
  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.accounts = new Map();
    this.ledgerEntries = new Map();
    this.cards = new Map();
    this.cardTransactions = new Map();
    this.kycReviews = new Map();
    this.auditEvents = new Map();
    this.deviceRegistrations = new Map();
    this.notificationHistory = new Map();
    this.notificationPreferences = new Map();
    this.bnrReports = new Map();
    this.reports = new Map();
  }

  // User management
  async createUser(user) {
    this.users.set(user.id, { ...user });
    return { ...user };
  }

  async findUserById(id) {
    return this.users.get(id) ? { ...this.users.get(id) } : null;
  }

  async findUserByPhone(phoneNumber) {
    for (const user of this.users.values()) {
      if (user.phoneNumber === phoneNumber) {
        return { ...user };
      }
    }
    return null;
  }

  async findUserByIdNumber(idNumber) {
    for (const user of this.users.values()) {
      if (user.idNumber === idNumber) {
        return { ...user };
      }
    }
    return null;
  }

  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, ...updates, updatedAt: new Date() };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return null;
  }

  async getAllUsers() {
    return Array.from(this.users.values()).map(user => ({ ...user }));
  }

  async getUsersByPage(page = 1, limit = 20, filters = {}) {
    let users = Array.from(this.users.values());

    // Apply filters
    if (filters.kycStatus) {
      users = users.filter(user => user.kycStatus === filters.kycStatus);
    }
    if (filters.status) {
      users = users.filter(user => user.status === filters.status);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      users = users.filter(user => 
        user.firstName.toLowerCase().includes(search) ||
        user.lastName.toLowerCase().includes(search) ||
        user.phoneNumber.includes(search)
      );
    }

    // Pagination
    const total = users.length;
    const offset = (page - 1) * limit;
    const data = users.slice(offset, offset + limit);

    return {
      data: data.map(user => ({ ...user })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // Account management
  async createAccount(account) {
    this.accounts.set(account.id, { ...account });
    return { ...account };
  }

  async getAccountByUserId(userId, accountType = 'WALLET') {
    for (const account of this.accounts.values()) {
      if (account.userId === userId && account.accountType === accountType) {
        return { ...account };
      }
    }
    return null;
  }

  async updateAccount(id, updates) {
    const account = this.accounts.get(id);
    if (account) {
      const updatedAccount = { ...account, ...updates, updatedAt: new Date() };
      this.accounts.set(id, updatedAccount);
      return updatedAccount;
    }
    return null;
  }

  // Transaction management
  async createTransaction(transaction) {
    this.transactions.set(transaction.id, { ...transaction });
    return { ...transaction };
  }

  async getTransaction(id) {
    return this.transactions.get(id) ? { ...this.transactions.get(id) } : null;
  }

  async updateTransaction(id, updates) {
    const transaction = this.transactions.get(id);
    if (transaction) {
      const updated = { ...transaction, ...updates, updatedAt: new Date() };
      this.transactions.set(id, updated);
      return updated;
    }
    return null;
  }

  async getTransactionsByUserId(userId, options = {}) {
    const { offset = 0, limit = 20, type, status } = options;
    let transactions = Array.from(this.transactions.values()).filter(tx => 
      tx.senderId === userId || tx.recipientId === userId
    );

    // Apply filters
    if (type) {
      transactions = transactions.filter(tx => tx.type === type);
    }
    if (status) {
      transactions = transactions.filter(tx => tx.status === status);
    }

    // Sort by creation date (newest first)
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = transactions.length;
    const data = transactions.slice(offset, offset + limit);

    return {
      data: data.map(tx => ({ ...tx })),
      total,
    };
  }

  async getTransactionsByDateRange(startDate, endDate, type = null) {
    let transactions = Array.from(this.transactions.values()).filter(tx => {
      const txDate = new Date(tx.createdAt);
      return txDate >= startDate && txDate <= endDate;
    });

    if (type) {
      transactions = transactions.filter(tx => tx.type === type);
    }

    return transactions.map(tx => ({ ...tx }));
  }

  async getTransactionsByUserIdAndDateRange(userId, startDate, endDate, type = null) {
    let transactions = Array.from(this.transactions.values()).filter(tx => {
      const txDate = new Date(tx.createdAt);
      const isUserTransaction = tx.senderId === userId || tx.recipientId === userId;
      const isInRange = txDate >= startDate && txDate <= endDate;
      return isUserTransaction && isInRange;
    });

    if (type) {
      transactions = transactions.filter(tx => tx.type === type);
    }

    return transactions.map(tx => ({ ...tx }));
  }

  // Ledger entry management
  async createLedgerEntry(entry) {
    this.ledgerEntries.set(entry.id, { ...entry });
    return { ...entry };
  }

  async getLedgerEntriesByTransaction(transactionId) {
    return Array.from(this.ledgerEntries.values())
      .filter(entry => entry.transactionId === transactionId)
      .map(entry => ({ ...entry }));
  }

  async getLedgerEntriesByDateRange(startDate, endDate) {
    return Array.from(this.ledgerEntries.values())
      .filter(entry => {
        const entryDate = new Date(entry.createdAt);
        return entryDate >= startDate && entryDate <= endDate;
      })
      .map(entry => ({ ...entry }));
  }

  async getLedgerEntriesByAccountAndDateRange(accountId, startDate, endDate) {
    return Array.from(this.ledgerEntries.values())
      .filter(entry => {
        const entryDate = new Date(entry.createdAt);
        const isAccount = entry.accountId === accountId;
        const isInRange = entryDate >= startDate && entryDate <= endDate;
        return isAccount && isInRange;
      })
      .map(entry => ({ ...entry }));
  }

  // Card management
  async createCard(card) {
    this.cards.set(card.id, { ...card });
    return { ...card };
  }

  async getCard(id) {
    return this.cards.get(id) ? { ...this.cards.get(id) } : null;
  }

  async getCardsByUserId(userId) {
    return Array.from(this.cards.values())
      .filter(card => card.userId === userId)
      .map(card => ({ ...card }));
  }

  async updateCard(id, updates) {
    const card = this.cards.get(id);
    if (card) {
      const updated = { ...card, ...updates, updatedAt: new Date() };
      this.cards.set(id, updated);
      return updated;
    }
    return null;
  }

  // Card transaction management
  async createCardTransaction(transaction) {
    this.cardTransactions.set(transaction.id, { ...transaction });
    return { ...transaction };
  }

  async updateCardTransaction(id, updates) {
    const transaction = this.cardTransactions.get(id);
    if (transaction) {
      const updated = { ...transaction, ...updates, updatedAt: new Date() };
      this.cardTransactions.set(id, updated);
      return updated;
    }
    return null;
  }

  async getCardTransactionsByCardId(cardId, options = {}) {
    const { offset = 0, limit = 20 } = options;
    let transactions = Array.from(this.cardTransactions.values())
      .filter(tx => tx.cardId === cardId);

    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = transactions.length;
    const data = transactions.slice(offset, offset + limit);

    return {
      data: data.map(tx => ({ ...tx })),
      total,
    };
  }

  async getCardTransactionsByDateRange(cardId, startDate, endDate) {
    return Array.from(this.cardTransactions.values())
      .filter(tx => {
        const txDate = new Date(tx.createdAt);
        return tx.cardId === cardId && txDate >= startDate && txDate <= endDate;
      })
      .map(tx => ({ ...tx }));
  }

  // KYC review management
  async createKYCReview(review) {
    this.kycReviews.set(review.id, { ...review });
    return { ...review };
  }

  async getKYCReview(id) {
    return this.kycReviews.get(id) ? { ...this.kycReviews.get(id) } : null;
  }

  async getKYCReviewsByStatus(status) {
    return Array.from(this.kycReviews.values())
      .filter(review => review.status === status)
      .map(review => ({ ...review }));
  }

  async getKYCStats(dateRange = 'today') {
    const reviews = Array.from(this.kycReviews.values());
    const now = new Date();
    let startDate;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    const filteredReviews = reviews.filter(review => 
      new Date(review.submittedAt) >= startDate
    );

    const totalSubmissions = filteredReviews.length;
    const approved = filteredReviews.filter(r => r.status === 'approved').length;
    const rejected = filteredReviews.filter(r => r.status === 'rejected').length;
    const pending = filteredReviews.filter(r => r.status === 'pending').length;

    return {
      totalSubmissions,
      approved,
      rejected,
      pending,
      approvalRate: totalSubmissions > 0 ? (approved / totalSubmissions) * 100 : 0,
    };
  }

  async getKYCEventsByDateRange(startDate, endDate) {
    // In a real implementation, this would query audit events
    // For now, return mock data based on existing reviews
    return Array.from(this.kycReviews.values())
      .filter(review => {
        const reviewDate = new Date(review.submittedAt);
        return reviewDate >= startDate && reviewDate <= endDate;
      })
      .map(review => ({
        action: `KYC_${review.status.toUpperCase()}`,
        userId: review.userId,
        submittedAt: review.submittedAt,
        completedAt: review.completedAt,
      }));
  }

  // Audit event management
  async createAuditEvent(event) {
    this.auditEvents.set(event.id, { ...event });
    return { ...event };
  }

  async getAuditEvents(options = {}) {
    const { offset = 0, limit = 50, userId, action } = options;
    let events = Array.from(this.auditEvents.values());

    if (userId) {
      events = events.filter(event => event.userId === userId);
    }
    if (action) {
      events = events.filter(event => event.action === action);
    }

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = events.length;
    const data = events.slice(offset, offset + limit);

    return {
      data: data.map(event => ({ ...event })),
      total,
    };
  }

  // Device registration management
  async createDeviceRegistration(device) {
    this.deviceRegistrations.set(device.id, { ...device });
    return { ...device };
  }

  async getDeviceRegistrationsByUserId(userId) {
    return Array.from(this.deviceRegistrations.values())
      .filter(device => device.userId === userId)
      .map(device => ({ ...device }));
  }

  async deactivateDeviceToken(token) {
    for (const [id, device] of this.deviceRegistrations.entries()) {
      if (device.token === token) {
        device.active = false;
        device.deactivatedAt = new Date();
        this.deviceRegistrations.set(id, device);
        break;
      }
    }
  }

  // Notification management
  async createNotificationHistory(notification) {
    this.notificationHistory.set(notification.id, { ...notification });
    return { ...notification };
  }

  async getNotificationHistory(userId, options = {}) {
    const { offset = 0, limit = 20 } = options;
    let notifications = Array.from(this.notificationHistory.values())
      .filter(notif => notif.userId === userId);

    notifications.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    const total = notifications.length;
    const data = notifications.slice(offset, offset + limit);

    return {
      data: data.map(notif => ({ ...notif })),
      total,
    };
  }

  async updateNotificationPreferences(userId, preferences) {
    this.notificationPreferences.set(userId, { ...preferences });
    return preferences;
  }

  async getNotificationPreferences(userId) {
    return this.notificationPreferences.get(userId) || null;
  }

  // BNR report management
  async createBNRReport(report) {
    this.bnrReports.set(report.id, { ...report });
    return { ...report };
  }

  async getBNRReports(options = {}) {
    const { limit = 10 } = options;
    let reports = Array.from(this.bnrReports.values());
    
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return reports.slice(0, limit).map(report => ({ ...report }));
  }

  // General report management
  async getReports(type = 'all', limit = 10) {
    let reports = [];

    // Add BNR reports
    if (type === 'all' || type === 'bnr') {
      const bnrReports = Array.from(this.bnrReports.values()).map(report => ({
        ...report,
        type: 'bnr',
      }));
      reports.push(...bnrReports);
    }

    // Sort by creation date
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return reports.slice(0, limit);
  }

  // Statistics helpers
  async getCardStatistics(dateRange = 'today') {
    const cards = Array.from(this.cards.values());
    const transactions = Array.from(this.cardTransactions.values());

    const now = new Date();
    let startDate;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    const recentTransactions = transactions.filter(tx => 
      new Date(tx.createdAt) >= startDate
    );

    return {
      totalCards: cards.length,
      activeCards: cards.filter(card => card.status === 'active').length,
      blockedCards: cards.filter(card => card.status === 'blocked').length,
      transactionCount: recentTransactions.length,
      transactionVolume: recentTransactions.reduce((sum, tx) => sum + tx.amount, 0),
    };
  }

  // Clear all data (for testing)
  async clearAll() {
    this.users.clear();
    this.transactions.clear();
    this.accounts.clear();
    this.ledgerEntries.clear();
    this.cards.clear();
    this.cardTransactions.clear();
    this.kycReviews.clear();
    this.auditEvents.clear();
    this.deviceRegistrations.clear();
    this.notificationHistory.clear();
    this.notificationPreferences.clear();
    this.bnrReports.clear();
    this.reports.clear();
  }

  // Get storage statistics
  getStorageStats() {
    return {
      users: this.users.size,
      transactions: this.transactions.size,
      accounts: this.accounts.size,
      ledgerEntries: this.ledgerEntries.size,
      cards: this.cards.size,
      cardTransactions: this.cardTransactions.size,
      kycReviews: this.kycReviews.size,
      auditEvents: this.auditEvents.size,
      deviceRegistrations: this.deviceRegistrations.size,
      notificationHistory: this.notificationHistory.size,
      bnrReports: this.bnrReports.size,
    };
  }
}

module.exports = new MemoryStorage();
