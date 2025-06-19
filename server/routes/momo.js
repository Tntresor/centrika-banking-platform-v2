const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const MoMoService = require('../services/MoMoService');
const LedgerService = require('../services/LedgerService');
const NotificationService = require('../services/NotificationService');
const storage = require('../storage/MemoryStorage');
const Transaction = require('../models/Transaction');

const router = express.Router();

// BNR limits
const BNR_LIMITS = {
  SINGLE_TRANSACTION: 1000000, // 1M RWF
  DAILY_LIMIT: 1000000, // 1M RWF
  ACCOUNT_BALANCE: 2000000, // 2M RWF
};

// Deposit from Mobile Money
router.post('/deposit', auth, [
  body('amount').isFloat({ min: 100, max: 1000000 }),
  body('phoneNumber').matches(/^(\+250|250)?[0-9]{9}$/),
  body('provider').optional().isIn(['MTN', 'AIRTEL', 'TIGO']),
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

    const { amount, phoneNumber, provider = 'MTN' } = req.body;
    const userId = req.user.userId;

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
    const todayDeposits = await LedgerService.getTodayTransactionSum(userId, 'deposit');
    if (todayDeposits + amount > BNR_LIMITS.DAILY_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Daily deposit limit exceeded. Limit: ${BNR_LIMITS.DAILY_LIMIT} RWF`,
      });
    }

    // Check account balance limit
    const currentBalance = await LedgerService.getBalance(userId);
    if (currentBalance + amount > BNR_LIMITS.ACCOUNT_BALANCE) {
      return res.status(400).json({
        success: false,
        message: `Account balance limit exceeded. Limit: ${BNR_LIMITS.ACCOUNT_BALANCE} RWF`,
      });
    }

    // Create transaction record
    const transaction = new Transaction({
      type: 'deposit',
      subType: 'momo_deposit',
      senderId: null, // External MoMo account
      recipientId: userId,
      amount,
      currency: 'RWF',
      description: `Mobile Money deposit from ${phoneNumber}`,
      metadata: {
        provider,
        sourcePhone: phoneNumber,
        method: 'mobile_money',
      },
      status: 'pending',
    });

    // Initiate MoMo collection
    const momoResult = await MoMoService.initiateCollection({
      amount,
      phoneNumber,
      externalId: transaction.id,
      payerMessage: `Deposit to Centrika account`,
      payeeNote: `Deposit for user ${userId}`,
    });

    if (momoResult.success) {
      // Update transaction with MoMo reference
      transaction.metadata.momoTransactionId = momoResult.transactionId;
      transaction.metadata.momoStatus = momoResult.status;

      // For demo purposes, simulate successful collection
      // In production, this would be handled by webhook
      setTimeout(async () => {
        try {
          await this.handleMoMoCallback(transaction.id, {
            status: 'SUCCESSFUL',
            transactionId: momoResult.transactionId,
          });
        } catch (error) {
          console.error('MoMo callback simulation error:', error);
        }
      }, 3000); // 3 second delay to simulate processing time

      res.json({
        success: true,
        message: 'Deposit initiated successfully. You will receive an SMS to complete the payment.',
        transaction: {
          id: transaction.id,
          amount,
          status: 'pending',
          provider,
          phoneNumber,
          createdAt: transaction.createdAt,
        },
      });

    } else {
      transaction.status = 'failed';
      transaction.metadata.failureReason = momoResult.message;

      res.status(400).json({
        success: false,
        message: momoResult.message || 'Failed to initiate deposit',
      });
    }

  } catch (error) {
    console.error('MoMo deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Deposit failed',
    });
  }
});

// Withdraw to Mobile Money
router.post('/withdraw', auth, [
  body('amount').isFloat({ min: 100, max: 1000000 }),
  body('phoneNumber').matches(/^(\+250|250)?[0-9]{9}$/),
  body('provider').optional().isIn(['MTN', 'AIRTEL', 'TIGO']),
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

    const { amount, phoneNumber, provider = 'MTN' } = req.body;
    const userId = req.user.userId;

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
    const todayWithdrawals = await LedgerService.getTodayTransactionSum(userId, 'withdrawal');
    if (todayWithdrawals + amount > BNR_LIMITS.DAILY_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Daily withdrawal limit exceeded. Limit: ${BNR_LIMITS.DAILY_LIMIT} RWF`,
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

    // Create transaction record
    const transaction = new Transaction({
      type: 'withdrawal',
      subType: 'momo_withdrawal',
      senderId: userId,
      recipientId: null, // External MoMo account
      amount,
      currency: 'RWF',
      description: `Mobile Money withdrawal to ${phoneNumber}`,
      metadata: {
        provider,
        destinationPhone: phoneNumber,
        method: 'mobile_money',
      },
      status: 'pending',
    });

    // Initiate MoMo disbursement
    const momoResult = await MoMoService.initiateDisbursement({
      amount,
      phoneNumber,
      externalId: transaction.id,
      payerMessage: `Withdrawal from Centrika`,
      payeeNote: `Withdrawal for user ${userId}`,
    });

    if (momoResult.success) {
      // Update transaction with MoMo reference
      transaction.metadata.momoTransactionId = momoResult.transactionId;
      transaction.metadata.momoStatus = momoResult.status;

      // Process withdrawal in ledger (debit user account)
      const ledgerResult = await LedgerService.processWithdrawal(userId, amount, transaction);

      if (ledgerResult.success) {
        // For demo purposes, simulate successful disbursement
        setTimeout(async () => {
          try {
            await this.handleMoMoCallback(transaction.id, {
              status: 'SUCCESSFUL',
              transactionId: momoResult.transactionId,
            });
          } catch (error) {
            console.error('MoMo callback simulation error:', error);
          }
        }, 3000);

        res.json({
          success: true,
          message: 'Withdrawal initiated successfully. You will receive confirmation shortly.',
          transaction: {
            id: transaction.id,
            amount,
            status: 'pending',
            provider,
            phoneNumber,
            createdAt: transaction.createdAt,
          },
        });

      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to process withdrawal',
        });
      }

    } else {
      transaction.status = 'failed';
      transaction.metadata.failureReason = momoResult.message;

      res.status(400).json({
        success: false,
        message: momoResult.message || 'Failed to initiate withdrawal',
      });
    }

  } catch (error) {
    console.error('MoMo withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Withdrawal failed',
    });
  }
});

// MoMo webhook callback (for production integration)
router.post('/callback', async (req, res) => {
  try {
    const { transactionId, status, externalId, amount, currency } = req.body;

    console.log('MoMo callback received:', req.body);

    // Verify webhook signature (in production)
    // const signature = req.headers['x-momo-signature'];
    // if (!MoMoService.verifyWebhookSignature(req.body, signature)) {
    //   return res.status(401).json({ success: false, message: 'Invalid signature' });
    // }

    await this.handleMoMoCallback(externalId, {
      status,
      transactionId,
      amount,
      currency,
    });

    res.json({ success: true });

  } catch (error) {
    console.error('MoMo callback error:', error);
    res.status(500).json({ success: false });
  }
});

// Handle MoMo callback processing
async function handleMoMoCallback(transactionId, callbackData) {
  try {
    const transaction = await LedgerService.getTransaction(transactionId);
    if (!transaction) {
      console.error('Transaction not found:', transactionId);
      return;
    }

    if (callbackData.status === 'SUCCESSFUL') {
      if (transaction.type === 'deposit' && transaction.status === 'pending') {
        // Process successful deposit
        const result = await LedgerService.processDeposit(
          transaction.recipientId,
          transaction.amount,
          transaction
        );

        if (result.success) {
          // Update transaction status
          transaction.status = 'completed';
          transaction.metadata.momoStatus = 'SUCCESSFUL';
          transaction.completedAt = new Date();

          // Send success notification
          await NotificationService.sendDepositNotification(
            transaction.recipientId,
            transaction.amount
          );
        }
      } else if (transaction.type === 'withdrawal' && transaction.status === 'pending') {
        // Mark withdrawal as completed (already processed in ledger)
        transaction.status = 'completed';
        transaction.metadata.momoStatus = 'SUCCESSFUL';
        transaction.completedAt = new Date();

        // Send success notification
        await NotificationService.sendWithdrawalNotification(
          transaction.senderId,
          transaction.amount
        );
      }

    } else {
      // Handle failed transaction
      transaction.status = 'failed';
      transaction.metadata.momoStatus = callbackData.status;
      transaction.metadata.failureReason = callbackData.message || 'Transaction failed';

      // If withdrawal failed, reverse the ledger entry
      if (transaction.type === 'withdrawal') {
        await LedgerService.reverseTransaction(transactionId);
      }

      // Send failure notification
      await NotificationService.sendTransactionFailedNotification(
        transaction.senderId || transaction.recipientId,
        transaction.amount,
        transaction.type
      );
    }

  } catch (error) {
    console.error('MoMo callback processing error:', error);
  }
}

// Get MoMo transaction status
router.get('/status/:transactionId', auth, async (req, res) => {
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

    // Get latest status from MoMo if still pending
    if (transaction.status === 'pending' && transaction.metadata.momoTransactionId) {
      const momoStatus = await MoMoService.getTransactionStatus(
        transaction.metadata.momoTransactionId
      );
      
      if (momoStatus.success) {
        transaction.metadata.momoStatus = momoStatus.status;
      }
    }

    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        momoStatus: transaction.metadata.momoStatus,
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt,
      },
    });

  } catch (error) {
    console.error('Get MoMo status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction status',
    });
  }
});

module.exports = router;
