const storage = require('../storage/MemoryStorage');
const Transaction = require('../models/Transaction');

// BNR compliance limits
const BNR_LIMITS = {
  SINGLE_TRANSACTION: 1000000, // 1M RWF
  DAILY_LIMIT: 1000000, // 1M RWF
  ACCOUNT_BALANCE: 2000000, // 2M RWF
};

class LedgerService {
  
  // Create a new ledger account
  async createAccount(userId, accountType, metadata = {}) {
    try {
      const account = {
        id: `acc_${Date.now()}_${userId}`,
        userId,
        accountType, // WALLET, CARD, etc.
        balance: 0,
        currency: 'RWF',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata,
      };

      await storage.createAccount(account);
      return account;

    } catch (error) {
      console.error('Create account error:', error);
      throw error;
    }
  }

  // Get user's main wallet balance
  async getBalance(userId) {
    try {
      const account = await storage.getAccountByUserId(userId, 'WALLET');
      return account ? account.balance : 0;
    } catch (error) {
      console.error('Get balance error:', error);
      return 0;
    }
  }

  // Process a deposit transaction
  async processDeposit(userId, amount, transaction) {
    try {
      // Validate amount
      if (amount <= 0) {
        return { success: false, message: 'Invalid deposit amount' };
      }

      // Check account balance limit
      const currentBalance = await this.getBalance(userId);
      if (currentBalance + amount > BNR_LIMITS.ACCOUNT_BALANCE) {
        return { 
          success: false, 
          message: 'Account balance limit exceeded',
          limit: BNR_LIMITS.ACCOUNT_BALANCE 
        };
      }

      // Create ledger entries (double-entry bookkeeping)
      const entries = [
        {
          id: `entry_${Date.now()}_1`,
          transactionId: transaction.id,
          accountId: `external_momo`,
          accountType: 'EXTERNAL',
          type: 'CREDIT',
          amount: amount,
          currency: 'RWF',
          description: `Deposit from external account`,
          createdAt: new Date(),
        },
        {
          id: `entry_${Date.now()}_2`,
          transactionId: transaction.id,
          accountId: `wallet_${userId}`,
          accountType: 'WALLET',
          userId: userId,
          type: 'DEBIT',
          amount: amount,
          currency: 'RWF',
          description: `Deposit to user wallet`,
          createdAt: new Date(),
        }
      ];

      // Process entries atomically
      for (const entry of entries) {
        await storage.createLedgerEntry(entry);
      }

      // Update account balance
      await this.updateAccountBalance(userId, amount, 'add');

      // Update transaction status
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      await storage.updateTransaction(transaction.id, transaction);

      return { 
        success: true, 
        newBalance: await this.getBalance(userId),
        entries 
      };

    } catch (error) {
      console.error('Process deposit error:', error);
      return { success: false, message: 'Deposit processing failed' };
    }
  }

  // Process a withdrawal transaction
  async processWithdrawal(userId, amount, transaction) {
    try {
      // Validate amount
      if (amount <= 0) {
        return { success: false, message: 'Invalid withdrawal amount' };
      }

      // Check sufficient balance
      const currentBalance = await this.getBalance(userId);
      if (currentBalance < amount) {
        return { success: false, message: 'Insufficient balance' };
      }

      // Create ledger entries
      const entries = [
        {
          id: `entry_${Date.now()}_1`,
          transactionId: transaction.id,
          accountId: `wallet_${userId}`,
          accountType: 'WALLET',
          userId: userId,
          type: 'CREDIT',
          amount: amount,
          currency: 'RWF',
          description: `Withdrawal from user wallet`,
          createdAt: new Date(),
        },
        {
          id: `entry_${Date.now()}_2`,
          transactionId: transaction.id,
          accountId: `external_momo`,
          accountType: 'EXTERNAL',
          type: 'DEBIT',
          amount: amount,
          currency: 'RWF',
          description: `Withdrawal to external account`,
          createdAt: new Date(),
        }
      ];

      // Process entries atomically
      for (const entry of entries) {
        await storage.createLedgerEntry(entry);
      }

      // Update account balance
      await this.updateAccountBalance(userId, amount, 'subtract');

      // Update transaction status
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      await storage.updateTransaction(transaction.id, transaction);

      return { 
        success: true, 
        newBalance: await this.getBalance(userId),
        entries 
      };

    } catch (error) {
      console.error('Process withdrawal error:', error);
      return { success: false, message: 'Withdrawal processing failed' };
    }
  }

  // Process P2P transfer
  async processTransfer(senderId, recipientId, amount, transaction) {
    try {
      // Validate amount
      if (amount <= 0) {
        return { success: false, message: 'Invalid transfer amount' };
      }

      // Check sender balance
      const senderBalance = await this.getBalance(senderId);
      if (senderBalance < amount) {
        return { success: false, message: 'Insufficient balance' };
      }

      // Check recipient balance limit
      const recipientBalance = await this.getBalance(recipientId);
      if (recipientBalance + amount > BNR_LIMITS.ACCOUNT_BALANCE) {
        return { 
          success: false, 
          message: 'Recipient account balance limit exceeded' 
        };
      }

      // Create ledger entries
      const entries = [
        {
          id: `entry_${Date.now()}_1`,
          transactionId: transaction.id,
          accountId: `wallet_${senderId}`,
          accountType: 'WALLET',
          userId: senderId,
          type: 'CREDIT',
          amount: amount,
          currency: 'RWF',
          description: `P2P transfer to user ${recipientId}`,
          createdAt: new Date(),
        },
        {
          id: `entry_${Date.now()}_2`,
          transactionId: transaction.id,
          accountId: `wallet_${recipientId}`,
          accountType: 'WALLET',
          userId: recipientId,
          type: 'DEBIT',
          amount: amount,
          currency: 'RWF',
          description: `P2P transfer from user ${senderId}`,
          createdAt: new Date(),
        }
      ];

      // Process entries atomically
      for (const entry of entries) {
        await storage.createLedgerEntry(entry);
      }

      // Update account balances
      await this.updateAccountBalance(senderId, amount, 'subtract');
      await this.updateAccountBalance(recipientId, amount, 'add');

      // Update transaction status
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      await storage.updateTransaction(transaction.id, transaction);

      return { 
        success: true,
        senderBalance: await this.getBalance(senderId),
        recipientBalance: await this.getBalance(recipientId),
        entries 
      };

    } catch (error) {
      console.error('Process transfer error:', error);
      return { success: false, message: 'Transfer processing failed' };
    }
  }

  // Process QR payment
  async processPayment(userId, amount, transaction) {
    try {
      // Validate amount
      if (amount <= 0) {
        return { success: false, message: 'Invalid payment amount' };
      }

      // Check user balance
      const userBalance = await this.getBalance(userId);
      if (userBalance < amount) {
        return { success: false, message: 'Insufficient balance' };
      }

      // Create ledger entries
      const entries = [
        {
          id: `entry_${Date.now()}_1`,
          transactionId: transaction.id,
          accountId: `wallet_${userId}`,
          accountType: 'WALLET',
          userId: userId,
          type: 'CREDIT',
          amount: amount,
          currency: 'RWF',
          description: `QR payment to ${transaction.metadata.merchantName}`,
          createdAt: new Date(),
        },
        {
          id: `entry_${Date.now()}_2`,
          transactionId: transaction.id,
          accountId: `merchant_${transaction.metadata.merchantId}`,
          accountType: 'MERCHANT',
          type: 'DEBIT',
          amount: amount,
          currency: 'RWF',
          description: `QR payment from user ${userId}`,
          createdAt: new Date(),
        }
      ];

      // Process entries atomically
      for (const entry of entries) {
        await storage.createLedgerEntry(entry);
      }

      // Update account balance
      await this.updateAccountBalance(userId, amount, 'subtract');

      // Update transaction status
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      await storage.updateTransaction(transaction.id, transaction);

      return { 
        success: true,
        newBalance: await this.getBalance(userId),
        entries 
      };

    } catch (error) {
      console.error('Process payment error:', error);
      return { success: false, message: 'Payment processing failed' };
    }
  }

  // Update account balance
  async updateAccountBalance(userId, amount, operation) {
    try {
      const account = await storage.getAccountByUserId(userId, 'WALLET');
      if (!account) {
        throw new Error('Account not found');
      }

      const newBalance = operation === 'add' 
        ? account.balance + amount 
        : account.balance - amount;

      if (newBalance < 0) {
        throw new Error('Insufficient balance');
      }

      account.balance = newBalance;
      account.updatedAt = new Date();

      await storage.updateAccount(account.id, account);
      return newBalance;

    } catch (error) {
      console.error('Update account balance error:', error);
      throw error;
    }
  }

  // Get transaction history
  async getTransactionHistory(userId, options = {}) {
    try {
      const { page = 1, limit = 20, type, status } = options;
      const offset = (page - 1) * limit;

      const transactions = await storage.getTransactionsByUserId(userId, {
        offset,
        limit,
        type,
        status,
      });

      return {
        data: transactions.data,
        total: transactions.total,
      };

    } catch (error) {
      console.error('Get transaction history error:', error);
      return { data: [], total: 0 };
    }
  }

  // Get single transaction
  async getTransaction(transactionId) {
    try {
      return await storage.getTransaction(transactionId);
    } catch (error) {
      console.error('Get transaction error:', error);
      return null;
    }
  }

  // Cancel pending transaction
  async cancelTransaction(transactionId) {
    try {
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return { success: false, message: 'Transaction not found' };
      }

      if (transaction.status !== 'pending') {
        return { success: false, message: 'Only pending transactions can be cancelled' };
      }

      // Update transaction status
      transaction.status = 'cancelled';
      transaction.cancelledAt = new Date();
      await storage.updateTransaction(transactionId, transaction);

      return { success: true };

    } catch (error) {
      console.error('Cancel transaction error:', error);
      return { success: false, message: 'Failed to cancel transaction' };
    }
  }

  // Reverse transaction (for failed external operations)
  async reverseTransaction(transactionId) {
    try {
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return { success: false, message: 'Transaction not found' };
      }

      // Create reversal entries
      const originalEntries = await storage.getLedgerEntriesByTransaction(transactionId);
      
      for (const entry of originalEntries) {
        const reversalEntry = {
          id: `reversal_${Date.now()}_${Math.random()}`,
          transactionId: `reversal_${transactionId}`,
          accountId: entry.accountId,
          accountType: entry.accountType,
          userId: entry.userId,
          type: entry.type === 'DEBIT' ? 'CREDIT' : 'DEBIT', // Reverse the type
          amount: entry.amount,
          currency: entry.currency,
          description: `Reversal of ${entry.description}`,
          createdAt: new Date(),
        };

        await storage.createLedgerEntry(reversalEntry);

        // Update account balance if it's a user wallet
        if (entry.accountType === 'WALLET' && entry.userId) {
          const balanceChange = entry.type === 'DEBIT' ? -entry.amount : entry.amount;
          await this.updateAccountBalance(entry.userId, Math.abs(balanceChange), 
            balanceChange > 0 ? 'subtract' : 'add');
        }
      }

      // Update transaction status
      transaction.status = 'reversed';
      transaction.reversedAt = new Date();
      await storage.updateTransaction(transactionId, transaction);

      return { success: true };

    } catch (error) {
      console.error('Reverse transaction error:', error);
      return { success: false, message: 'Failed to reverse transaction' };
    }
  }

  // Get today's transaction sum for a user
  async getTodayTransactionSum(userId, type = null) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const transactions = await storage.getTransactionsByUserIdAndDateRange(
        userId, today, tomorrow, type
      );

      return transactions.reduce((sum, tx) => {
        if (tx.status === 'completed' || tx.status === 'pending') {
          return sum + tx.amount;
        }
        return sum;
      }, 0);

    } catch (error) {
      console.error('Get today transaction sum error:', error);
      return 0;
    }
  }

  // Generate ledger report for BNR compliance
  async generateLedgerReport(startDate, endDate) {
    try {
      const entries = await storage.getLedgerEntriesByDateRange(startDate, endDate);
      
      const report = {
        reportDate: new Date(),
        period: { startDate, endDate },
        totalEntries: entries.length,
        totalVolume: entries.reduce((sum, entry) => sum + entry.amount, 0),
        summary: {
          deposits: 0,
          withdrawals: 0,
          transfers: 0,
          payments: 0,
        },
        entries: entries.map(entry => ({
          id: entry.id,
          transactionId: entry.transactionId,
          accountType: entry.accountType,
          type: entry.type,
          amount: entry.amount,
          currency: entry.currency,
          description: entry.description,
          createdAt: entry.createdAt,
        })),
      };

      // Calculate summary by transaction type
      for (const entry of entries) {
        const transaction = await this.getTransaction(entry.transactionId);
        if (transaction) {
          if (transaction.type === 'deposit') report.summary.deposits += entry.amount;
          else if (transaction.type === 'withdrawal') report.summary.withdrawals += entry.amount;
          else if (transaction.type === 'transfer') report.summary.transfers += entry.amount;
          else if (transaction.type === 'payment') report.summary.payments += entry.amount;
        }
      }

      return report;

    } catch (error) {
      console.error('Generate ledger report error:', error);
      throw error;
    }
  }

  // Get account statements
  async getAccountStatement(userId, startDate, endDate) {
    try {
      const account = await storage.getAccountByUserId(userId, 'WALLET');
      if (!account) {
        throw new Error('Account not found');
      }

      const entries = await storage.getLedgerEntriesByAccountAndDateRange(
        account.id, startDate, endDate
      );

      let runningBalance = account.balance;
      
      // Calculate running balance backwards
      const entriesWithBalance = entries.reverse().map(entry => {
        const entryWithBalance = {
          ...entry,
          balanceAfter: runningBalance,
        };
        
        // Adjust running balance for previous entry
        if (entry.type === 'DEBIT') {
          runningBalance -= entry.amount;
        } else {
          runningBalance += entry.amount;
        }
        
        entryWithBalance.balanceBefore = runningBalance;
        return entryWithBalance;
      }).reverse();

      return {
        account: {
          id: account.id,
          userId: account.userId,
          accountType: account.accountType,
          currency: account.currency,
          currentBalance: account.balance,
        },
        period: { startDate, endDate },
        entries: entriesWithBalance,
        summary: {
          openingBalance: runningBalance,
          closingBalance: account.balance,
          totalDebits: entries
            .filter(e => e.type === 'DEBIT')
            .reduce((sum, e) => sum + e.amount, 0),
          totalCredits: entries
            .filter(e => e.type === 'CREDIT')
            .reduce((sum, e) => sum + e.amount, 0),
        },
      };

    } catch (error) {
      console.error('Get account statement error:', error);
      throw error;
    }
  }
}

module.exports = new LedgerService();
