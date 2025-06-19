const express = require('express');
const { body, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const LedgerService = require('../services/LedgerService');
const NotificationService = require('../services/NotificationService');
const storage = require('../storage/MemoryStorage');
const Transaction = require('../models/Transaction');

const router = express.Router();

// BNR transaction limits
const BNR_LIMITS = {
  SINGLE_TRANSACTION: 1000000, // 1M RWF
  DAILY_LIMIT: 1000000, // 1M RWF
  ACCOUNT_BALANCE: 2000000, // 2M RWF
};

// Get user transactions
router.get('/:userId', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['deposit', 'withdrawal', 'transfer', 'payment']),
  query('status').optional().isIn(['pending', 'completed', 'failed', 'cancelled']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { userId } = req.params;
    const { page = 1, limit = 20, type, status } = req.query;

    // Check authorization
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const transactions = await LedgerService.getTransactionHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      status,
    });

    res.json({
      success: true,
      transactions: transactions.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: transactions.total,
        pages: Math.ceil(transactions.total / limit),
      },
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions',
    });
  }
});

// P2P Transfer
router.post('/p2p', auth, [
  body('recipientPhone').matches(/^(\+250|250)?[0-9]{9}$/),
  body('amount').isFloat({ min: 100, max: 1000000 }),
  body('note').optional().isLength({ max: 100 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { recipientPhone, amount, note } = req.body;
    const senderId = req.user.userId;

    // Find recipient
    const recipient = await storage.findUserByPhone(recipientPhone);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found',
      });
    }

    if (recipient.id === senderId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to yourself',
      });
    }

    // Check sender KYC status
    const sender = await storage.findUserById(senderId);
    if (sender.kycStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required',
      });
    }

    // Check recipient KYC status
    if (recipient.kycStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Recipient KYC not verified',
      });
    }

    // Check daily limits
    const todayTransactions = await LedgerService.getTodayTransactionSum(senderId);
    if (todayTransactions + amount > BNR_LIMITS.DAILY_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Daily limit exceeded. Limit: ${BNR_LIMITS.DAILY_LIMIT} RWF`,
      });
    }

    // Check sender balance
    const senderBalance = await LedgerService.getBalance(senderId);
    if (senderBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
      });
    }

    // Check recipient balance limit
    const recipientBalance = await LedgerService.getBalance(recipient.id);
    if (recipientBalance + amount > BNR_LIMITS.ACCOUNT_BALANCE) {
      return res.status(400).json({
        success: false,
        message: 'Recipient account balance limit exceeded',
      });
    }

    // Create transaction
    const transaction = new Transaction({
      type: 'transfer',
      subType: 'p2p',
      senderId,
      recipientId: recipient.id,
      amount,
      currency: 'RWF',
      description: `P2P transfer to ${recipient.firstName} ${recipient.lastName}`,
      note,
      metadata: {
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        recipientPhone: recipient.phoneNumber,
      },
    });

    // Process transfer
    const result = await LedgerService.processTransfer(
      senderId,
      recipient.id,
      amount,
      transaction
    );

    if (result.success) {
      // Send notifications
      await NotificationService.sendTransferNotification(senderId, recipient.id, amount, transaction.id);

      res.json({
        success: true,
        message: 'Transfer completed successfully',
        transaction: {
          id: transaction.id,
          amount,
          recipient: {
            name: `${recipient.firstName} ${recipient.lastName}`,
            phone: recipient.phoneNumber,
          },
          status: 'completed',
          createdAt: transaction.createdAt,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Transfer failed',
      });
    }

  } catch (error) {
    console.error('P2P transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Transfer failed',
    });
  }
});

// QR Payment
router.post('/qr-payment', auth, [
  body('qrData').notEmpty(),
  body('amount').optional().isFloat({ min: 100, max: 1000000 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { qrData, amount: overrideAmount } = req.body;
    const userId = req.user.userId;

    // Parse QR code data
    const QRUtils = require('../utils/QRUtils');
    const parsedQR = QRUtils.parseEMVCoQR(qrData);
    
    if (!parsedQR || !parsedQR.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code',
      });
    }

    const amount = overrideAmount || parsedQR.amount;
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount',
      });
    }

    // Check user KYC status
    const user = await storage.findUserById(userId);
    if (user.kycStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required',
      });
    }

    // Check BNR limits
    if (amount > BNR_LIMITS.SINGLE_TRANSACTION) {
      return res.status(400).json({
        success: false,
        message: `Amount exceeds single transaction limit: ${BNR_LIMITS.SINGLE_TRANSACTION} RWF`,
      });
    }

    // Check daily limits
    const todayTransactions = await LedgerService.getTodayTransactionSum(userId);
    if (todayTransactions + amount > BNR_LIMITS.DAILY_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Daily limit exceeded. Limit: ${BNR_LIMITS.DAILY_LIMIT} RWF`,
      });
    }

    // Check balance
    const balance = await LedgerService.getBalance(userId);
    if (balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
      });
    }

    // Create transaction
    const transaction = new Transaction({
      type: 'payment',
      subType: 'qr_payment',
      senderId: userId,
      amount,
      currency: 'RWF',
      description: `QR payment to ${parsedQR.merchantName}`,
      metadata: {
        merchantId: parsedQR.merchantId,
        merchantName: parsedQR.merchantName,
        qrData: parsedQR,
      },
    });

    // Process payment
    const result = await LedgerService.processPayment(userId, amount, transaction);

    if (result.success) {
      // Send notification
      await NotificationService.sendPaymentNotification(userId, amount, parsedQR.merchantName);

      res.json({
        success: true,
        message: 'Payment completed successfully',
        transaction: {
          id: transaction.id,
          amount,
          merchant: {
            id: parsedQR.merchantId,
            name: parsedQR.merchantName,
          },
          status: 'completed',
          createdAt: transaction.createdAt,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Payment failed',
      });
    }

  } catch (error) {
    console.error('QR payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment failed',
    });
  }
});

// Get transaction details
router.get('/detail/:transactionId', auth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.userId;

    const transaction = await LedgerService.getTransaction(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Check authorization
    if (transaction.senderId !== userId && 
        transaction.recipientId !== userId && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      transaction,
    });

  } catch (error) {
    console.error('Get transaction detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction details',
    });
  }
});

// Cancel transaction (for pending transactions only)
router.post('/cancel/:transactionId', auth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.userId;

    const transaction = await LedgerService.getTransaction(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    // Check authorization
    if (transaction.senderId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending transactions can be cancelled',
      });
    }

    // Cancel transaction
    const result = await LedgerService.cancelTransaction(transactionId);

    if (result.success) {
      // Send notification
      await NotificationService.sendTransactionCancelledNotification(userId, transactionId);

      res.json({
        success: true,
        message: 'Transaction cancelled successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to cancel transaction',
      });
    }

  } catch (error) {
    console.error('Cancel transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel transaction',
    });
  }
});

// Get account balance
router.get('/balance/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check authorization
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const balance = await LedgerService.getBalance(userId);

    res.json({
      success: true,
      balance,
      currency: 'RWF',
    });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve balance',
    });
  }
});

module.exports = router;
