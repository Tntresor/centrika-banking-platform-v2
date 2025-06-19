const crypto = require('../utils/crypto');
const storage = require('../storage/MemoryStorage');

class CardService {
  
  // Create virtual UnionPay card
  async createVirtualCard(cardData) {
    try {
      const { userId, type = 'prepaid', currency = 'RWF', cardholderName } = cardData;

      // Generate card details
      const cardDetails = this.generateVirtualCardDetails();
      
      // Create card object
      const card = {
        id: `card_${Date.now()}_${userId}`,
        userId,
        type, // debit, prepaid, credit
        brand: 'UnionPay',
        isVirtual: true,
        status: 'active',
        
        // Encrypted card details
        pan: await crypto.encrypt(cardDetails.pan),
        cvv: await crypto.encrypt(cardDetails.cvv),
        expiryMonth: cardDetails.expiryMonth,
        expiryYear: cardDetails.expiryYear,
        
        cardholderName,
        currency,
        
        // Card limits
        limits: {
          dailyLimit: 500000, // 500k RWF
          monthlyLimit: 2000000, // 2M RWF
          transactionLimit: 100000, // 100k RWF per transaction
        },
        
        // Card settings
        settings: {
          contactlessEnabled: true,
          onlineTransactionsEnabled: true,
          internationalTransactionsEnabled: false,
          atmWithdrawalsEnabled: false, // Virtual cards can't be used at ATMs
        },
        
        createdAt: new Date(),
        updatedAt: new Date(),
        
        metadata: {
          issuer: 'Centrika Neobank',
          country: 'RW',
          cardNetwork: 'UnionPay',
          testBin: true, // Indicates test card for Phase 1
        },
      };

      await storage.createCard(card);

      return card;

    } catch (error) {
      console.error('Create virtual card error:', error);
      throw error;
    }
  }

  // Generate virtual card details (test BIN for UnionPay)
  generateVirtualCardDetails() {
    // UnionPay test BIN ranges: 622126-622925
    const testBins = [
      '622126', '622200', '622300', '622400', '622500',
      '622600', '622700', '622800', '622900', '622925'
    ];
    
    const randomBin = testBins[Math.floor(Math.random() * testBins.length)];
    
    // Generate remaining 10 digits
    let pan = randomBin;
    for (let i = 0; i < 10; i++) {
      pan += Math.floor(Math.random() * 10);
    }
    
    // Calculate Luhn check digit
    pan = pan.substring(0, 15) + this.calculateLuhnDigit(pan.substring(0, 15));
    
    // Generate CVV (3 digits)
    const cvv = Math.floor(Math.random() * 900 + 100).toString();
    
    // Set expiry date (2 years from now)
    const now = new Date();
    const expiryDate = new Date(now.getFullYear() + 2, now.getMonth(), 1);
    
    return {
      pan,
      cvv,
      expiryMonth: String(expiryDate.getMonth() + 1).padStart(2, '0'),
      expiryYear: String(expiryDate.getFullYear()).substring(2),
    };
  }

  // Calculate Luhn algorithm check digit
  calculateLuhnDigit(partialPAN) {
    let sum = 0;
    let alternate = true;
    
    for (let i = partialPAN.length - 1; i >= 0; i--) {
      let digit = parseInt(partialPAN.charAt(i));
      
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = Math.floor(digit / 10) + (digit % 10);
        }
      }
      
      sum += digit;
      alternate = !alternate;
    }
    
    return (10 - (sum % 10)) % 10;
  }

  // Get user's cards
  async getUserCards(userId) {
    try {
      return await storage.getCardsByUserId(userId);
    } catch (error) {
      console.error('Get user cards error:', error);
      return [];
    }
  }

  // Get single card
  async getCard(cardId) {
    try {
      return await storage.getCard(cardId);
    } catch (error) {
      console.error('Get card error:', error);
      return null;
    }
  }

  // Get full card details (decrypt PAN and CVV)
  async getFullCardDetails(cardId) {
    try {
      const card = await storage.getCard(cardId);
      if (!card) {
        throw new Error('Card not found');
      }

      // Decrypt sensitive data
      const decryptedPAN = await crypto.decrypt(card.pan);
      const decryptedCVV = await crypto.decrypt(card.cvv);

      return {
        pan: decryptedPAN,
        cvv: decryptedCVV,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
      };

    } catch (error) {
      console.error('Get full card details error:', error);
      throw error;
    }
  }

  // Update card status
  async updateCardStatus(cardId, status, reason = null) {
    try {
      const card = await storage.getCard(cardId);
      if (!card) {
        return { success: false, message: 'Card not found' };
      }

      card.status = status;
      card.updatedAt = new Date();
      
      if (reason) {
        card.statusReason = reason;
      }

      // Log status change
      if (!card.statusHistory) {
        card.statusHistory = [];
      }
      
      card.statusHistory.push({
        status,
        reason,
        timestamp: new Date(),
      });

      await storage.updateCard(cardId, card);

      return { success: true };

    } catch (error) {
      console.error('Update card status error:', error);
      return { success: false, message: 'Failed to update card status' };
    }
  }

  // Update card limits
  async updateCardLimits(cardId, newLimits) {
    try {
      const card = await storage.getCard(cardId);
      if (!card) {
        return { success: false, message: 'Card not found' };
      }

      // Validate limits
      if (newLimits.dailyLimit && newLimits.dailyLimit > 1000000) {
        return { success: false, message: 'Daily limit cannot exceed 1M RWF' };
      }

      if (newLimits.transactionLimit && newLimits.transactionLimit > 500000) {
        return { success: false, message: 'Transaction limit cannot exceed 500k RWF' };
      }

      card.limits = { ...card.limits, ...newLimits };
      card.updatedAt = new Date();

      await storage.updateCard(cardId, card);

      return { 
        success: true, 
        limits: card.limits 
      };

    } catch (error) {
      console.error('Update card limits error:', error);
      return { success: false, message: 'Failed to update card limits' };
    }
  }

  // Get card balance (for prepaid cards)
  async getCardBalance(cardId) {
    try {
      const card = await storage.getCard(cardId);
      if (!card) {
        throw new Error('Card not found');
      }

      if (card.type === 'prepaid') {
        // For prepaid cards, get balance from ledger
        const LedgerService = require('./LedgerService');
        return await LedgerService.getBalance(card.userId);
      } else {
        // For debit cards, return available balance based on user wallet
        const LedgerService = require('./LedgerService');
        return await LedgerService.getBalance(card.userId);
      }

    } catch (error) {
      console.error('Get card balance error:', error);
      return 0;
    }
  }

  // Process card transaction
  async processCardTransaction(cardId, transactionData) {
    try {
      const card = await storage.getCard(cardId);
      if (!card) {
        return { success: false, message: 'Card not found' };
      }

      if (card.status !== 'active') {
        return { success: false, message: 'Card is not active' };
      }

      const { amount, merchantName, merchantId, currency = 'RWF' } = transactionData;

      // Check transaction limits
      if (amount > card.limits.transactionLimit) {
        return { 
          success: false, 
          message: `Transaction amount exceeds limit: ${card.limits.transactionLimit} RWF` 
        };
      }

      // Check daily limit
      const todayTransactions = await this.getTodayCardTransactions(cardId);
      const todayTotal = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      
      if (todayTotal + amount > card.limits.dailyLimit) {
        return { 
          success: false, 
          message: `Daily limit exceeded: ${card.limits.dailyLimit} RWF` 
        };
      }

      // Check balance
      const balance = await this.getCardBalance(cardId);
      if (balance < amount) {
        return { success: false, message: 'Insufficient balance' };
      }

      // Create card transaction record
      const cardTransaction = {
        id: `card_tx_${Date.now()}_${Math.random()}`,
        cardId,
        userId: card.userId,
        amount,
        currency,
        merchantName,
        merchantId,
        status: 'completed',
        type: 'purchase',
        createdAt: new Date(),
        metadata: {
          cardLast4: card.pan ? (await crypto.decrypt(card.pan)).slice(-4) : '****',
          authCode: this.generateAuthCode(),
        },
      };

      await storage.createCardTransaction(cardTransaction);

      // Process in main ledger
      const LedgerService = require('./LedgerService');
      const Transaction = require('../models/Transaction');
      
      const mainTransaction = new Transaction({
        type: 'payment',
        subType: 'card_payment',
        senderId: card.userId,
        amount,
        currency,
        description: `Card payment to ${merchantName}`,
        metadata: {
          cardId,
          merchantName,
          merchantId,
          cardTransaction: cardTransaction.id,
        },
      });

      const ledgerResult = await LedgerService.processPayment(
        card.userId, 
        amount, 
        mainTransaction
      );

      if (!ledgerResult.success) {
        // Reverse card transaction
        cardTransaction.status = 'failed';
        await storage.updateCardTransaction(cardTransaction.id, cardTransaction);
        return ledgerResult;
      }

      return {
        success: true,
        transaction: cardTransaction,
        authCode: cardTransaction.metadata.authCode,
      };

    } catch (error) {
      console.error('Process card transaction error:', error);
      return { success: false, message: 'Transaction processing failed' };
    }
  }

  // Generate authorization code
  generateAuthCode() {
    return Math.floor(Math.random() * 900000 + 100000).toString();
  }

  // Get today's card transactions
  async getTodayCardTransactions(cardId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await storage.getCardTransactionsByDateRange(cardId, today, tomorrow);

    } catch (error) {
      console.error('Get today card transactions error:', error);
      return [];
    }
  }

  // Get card transactions with pagination
  async getCardTransactions(cardId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const transactions = await storage.getCardTransactionsByCardId(cardId, {
        offset,
        limit,
      });

      return {
        data: transactions.data,
        total: transactions.total,
      };

    } catch (error) {
      console.error('Get card transactions error:', error);
      return { data: [], total: 0 };
    }
  }

  // Block/unblock card
  async toggleCardBlock(cardId, block = true, reason = null) {
    try {
      const status = block ? 'blocked' : 'active';
      return await this.updateCardStatus(cardId, status, reason);
    } catch (error) {
      console.error('Toggle card block error:', error);
      return { success: false, message: 'Failed to update card status' };
    }
  }

  // Update card settings
  async updateCardSettings(cardId, settings) {
    try {
      const card = await storage.getCard(cardId);
      if (!card) {
        return { success: false, message: 'Card not found' };
      }

      card.settings = { ...card.settings, ...settings };
      card.updatedAt = new Date();

      await storage.updateCard(cardId, card);

      return { 
        success: true, 
        settings: card.settings 
      };

    } catch (error) {
      console.error('Update card settings error:', error);
      return { success: false, message: 'Failed to update card settings' };
    }
  }

  // Generate card PIN
  async generateCardPIN(cardId) {
    try {
      const card = await storage.getCard(cardId);
      if (!card) {
        return { success: false, message: 'Card not found' };
      }

      // Generate 4-digit PIN
      const pin = Math.floor(Math.random() * 9000 + 1000).toString();
      
      // Encrypt and store PIN
      const encryptedPIN = await crypto.encrypt(pin);
      card.pin = encryptedPIN;
      card.pinSetAt = new Date();
      card.updatedAt = new Date();

      await storage.updateCard(cardId, card);

      // In production, PIN would be sent via secure SMS or displayed once
      return { 
        success: true, 
        pin, // Only return for demo/testing
        message: 'PIN generated successfully' 
      };

    } catch (error) {
      console.error('Generate card PIN error:', error);
      return { success: false, message: 'Failed to generate PIN' };
    }
  }

  // Verify card PIN
  async verifyCardPIN(cardId, enteredPIN) {
    try {
      const card = await storage.getCard(cardId);
      if (!card || !card.pin) {
        return false;
      }

      const storedPIN = await crypto.decrypt(card.pin);
      return storedPIN === enteredPIN;

    } catch (error) {
      console.error('Verify card PIN error:', error);
      return false;
    }
  }

  // Get card statistics for back-office
  async getCardStatistics(dateRange = 'today') {
    try {
      const stats = await storage.getCardStatistics(dateRange);
      return stats;
    } catch (error) {
      console.error('Get card statistics error:', error);
      return {
        totalCards: 0,
        activeCards: 0,
        blockedCards: 0,
        transactionVolume: 0,
        transactionCount: 0,
      };
    }
  }
}

module.exports = new CardService();
