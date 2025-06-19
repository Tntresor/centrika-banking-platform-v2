import { Router } from 'express';
import { storage } from '../storage';
import { momoService } from '../services/momoService';
import { ledgerService } from '../services/ledgerService';
import { notificationService } from '../services/notificationService';
import type { MoMoDepositRequest, MoMoWithdrawalRequest, APIResponse } from '../../shared/types';

const router = Router();

// MoMo Deposit
router.post('/deposit', async (req, res) => {
  try {
    const { amount, phoneNumber, currency = 'RWF' } = req.body as MoMoDepositRequest;
    const userId = req.user.userId;

    if (!amount || amount <= 0 || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount and phone number are required'
      } as APIResponse);
    }

    // Check BNR limits (1M RWF per transaction, 1M RWF daily limit)
    if (amount > 1000000) {
      return res.status(400).json({
        success: false,
        error: 'Deposit amount exceeds BNR Tier II limit (1,000,000 RWF)'
      } as APIResponse);
    }

    // Check if user has completed KYC
    const user = await storage.getUser(userId);
    if (!user || user.kycStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'KYC verification must be completed before making deposits'
      } as APIResponse);
    }

    // Initiate MoMo collection
    const momoResult = await momoService.initiateCollection({
      amount,
      phoneNumber,
      currency,
      reference: `DEP-${Date.now()}-${userId}`,
      description: `Deposit to Centrika wallet`
    });

    if (!momoResult.success) {
      return res.status(400).json({
        success: false,
        error: momoResult.error || 'MoMo collection failed'
      } as APIResponse);
    }

    // Create pending transaction
    const wallet = await storage.getWallet(userId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      } as APIResponse);
    }

    const transaction = await storage.createTransaction({
      toWalletId: wallet.id,
      amount: amount.toString(),
      currency,
      type: 'deposit',
      status: 'pending',
      reference: momoResult.reference,
      description: 'MoMo Deposit',
      metadata: {
        momoTransactionId: momoResult.transactionId,
        phoneNumber
      }
    });

    res.json({
      success: true,
      data: {
        transaction,
        momoReference: momoResult.reference,
        status: 'pending'
      }
    } as APIResponse);

  } catch (error) {
    console.error('MoMo deposit error:', error);
    res.status(500).json({
      success: false,
      error: 'Deposit failed'
    } as APIResponse);
  }
});

// MoMo Withdrawal
router.post('/withdraw', async (req, res) => {
  try {
    const { amount, phoneNumber, currency = 'RWF' } = req.body as MoMoWithdrawalRequest;
    const userId = req.user.userId;

    if (!amount || amount <= 0 || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount and phone number are required'
      } as APIResponse);
    }

    // Check BNR limits
    if (amount > 1000000) {
      return res.status(400).json({
        success: false,
        error: 'Withdrawal amount exceeds BNR Tier II limit (1,000,000 RWF)'
      } as APIResponse);
    }

    // Check if user has completed KYC
    const user = await storage.getUser(userId);
    if (!user || user.kycStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'KYC verification must be completed before making withdrawals'
      } as APIResponse);
    }

    // Check wallet balance
    const wallet = await storage.getWallet(userId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      } as APIResponse);
    }

    if (parseFloat(wallet.balance) < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      } as APIResponse);
    }

    // Initiate MoMo disbursement
    const momoResult = await momoService.initiateDisbursement({
      amount,
      phoneNumber,
      currency,
      reference: `WTH-${Date.now()}-${userId}`,
      description: `Withdrawal from Centrika wallet`
    });

    if (!momoResult.success) {
      return res.status(400).json({
        success: false,
        error: momoResult.error || 'MoMo disbursement failed'
      } as APIResponse);
    }

    // Create withdrawal transaction and update balance
    const result = await ledgerService.processWithdrawal(
      userId,
      amount,
      momoResult.reference,
      'MoMo Withdrawal'
    );

    // Send notification
    await notificationService.sendTransactionNotification(userId, result.transaction, 'withdrawal');

    res.json({
      success: true,
      data: {
        transaction: result.transaction,
        momoReference: momoResult.reference,
        newBalance: result.newBalance
      }
    } as APIResponse);

  } catch (error) {
    console.error('MoMo withdrawal error:', error);
    res.status(500).json({
      success: false,
      error: 'Withdrawal failed'
    } as APIResponse);
  }
});

// Check MoMo transaction status
router.get('/status/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.user.userId;

    // Get transaction by reference
    const transactions = await storage.getTransactionsByDateRange(
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    );

    const transaction = transactions.find(tx => tx.reference === reference);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      } as APIResponse);
    }

    // Verify transaction belongs to user
    const wallet = await storage.getWallet(userId);
    if (!wallet || (transaction.fromWalletId !== wallet.id && transaction.toWalletId !== wallet.id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      } as APIResponse);
    }

    // Check MoMo status
    const momoStatus = await momoService.checkTransactionStatus(reference);

    // Update transaction status if needed
    if (momoStatus.status !== transaction.status) {
      await storage.updateTransaction(transaction.id, { status: momoStatus.status });
      
      // If deposit is successful, update wallet balance
      if (momoStatus.status === 'completed' && transaction.type === 'deposit') {
        const newBalance = (parseFloat(wallet.balance) + parseFloat(transaction.amount)).toString();
        await storage.updateWalletBalance(wallet.id, newBalance);
        
        // Send success notification
        await notificationService.sendTransactionNotification(userId, transaction, 'deposit_success');
      }
    }

    res.json({
      success: true,
      data: {
        reference,
        status: momoStatus.status,
        amount: transaction.amount,
        currency: transaction.currency,
        type: transaction.type,
        createdAt: transaction.createdAt
      }
    } as APIResponse);

  } catch (error) {
    console.error('MoMo status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check transaction status'
    } as APIResponse);
  }
});

export default router;
