import { Router } from 'express';
import { storage } from '../storage';
import { paymentService } from '../services/paymentService';
import { ledgerService } from '../services/ledgerService';
import { notificationService } from '../services/notificationService';
import type { DepositRequest, P2PTransferRequest, QRPaymentRequest, APIResponse } from '../../shared/types';

const router = Router();

// MoMo deposit
router.post('/deposit/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { amount, phoneNumber, provider }: DepositRequest = req.body;

    if (!amount || amount <= 0 || amount > 1000000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Must be between 1 and 1,000,000 RWF'
      } as APIResponse);
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as APIResponse);
    }

    // Create transaction record
    const reference = `DEP_${Date.now()}_${userId}`;
    const transaction = await storage.createTransaction({
      toWalletId: (await storage.getWallet(userId))?.id!,
      amount: amount.toString(),
      currency: 'RWF',
      type: 'deposit',
      status: 'pending',
      reference,
      description: `MoMo deposit from ${phoneNumber}`,
      metadata: JSON.stringify({ provider, phoneNumber })
    });

    // Process MoMo payment
    const paymentResult = await paymentService.processMoMoDeposit({
      amount,
      phoneNumber,
      provider,
      reference
    });

    if (paymentResult.success) {
      // Update transaction status
      await storage.updateTransaction(transaction.id, { status: 'completed' });
      
      // Update ledger
      await ledgerService.creditWallet(userId, amount, reference);
      
      // Send notification
      await notificationService.sendPushNotification(userId, {
        title: 'Deposit Successful',
        body: `Your deposit of ${amount} RWF has been completed`,
        data: { type: 'deposit', reference }
      });

      res.json({
        success: true,
        message: 'Deposit completed successfully',
        data: { 
          reference,
          amount,
          status: 'completed'
        }
      } as APIResponse);
    } else {
      await storage.updateTransaction(transaction.id, { status: 'failed' });
      
      res.status(400).json({
        success: false,
        error: paymentResult.error || 'Deposit failed'
      } as APIResponse);
    }

  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process deposit'
    } as APIResponse);
  }
});

// P2P transfer
router.post('/p2p/:userId', async (req, res) => {
  try {
    const fromUserId = parseInt(req.params.userId);
    const { toPhone, amount, description }: P2PTransferRequest = req.body;

    if (!amount || amount <= 0 || amount > 1000000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Must be between 1 and 1,000,000 RWF'
      } as APIResponse);
    }

    const fromUser = await storage.getUser(fromUserId);
    const toUser = await storage.getUserByPhone(toPhone);

    if (!fromUser || !toUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as APIResponse);
    }

    if (fromUser.id === toUser.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer to yourself'
      } as APIResponse);
    }

    // Check sender balance
    const fromWallet = await storage.getWallet(fromUserId);
    if (!fromWallet || parseFloat(fromWallet.balance) < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      } as APIResponse);
    }

    const toWallet = await storage.getWallet(toUser.id);
    if (!toWallet) {
      return res.status(404).json({
        success: false,
        error: 'Recipient wallet not found'
      } as APIResponse);
    }

    // Create transaction
    const reference = `P2P_${Date.now()}_${fromUserId}`;
    const transaction = await storage.createTransaction({
      fromWalletId: fromWallet.id,
      toWalletId: toWallet.id,
      amount: amount.toString(),
      currency: 'RWF',
      type: 'p2p',
      status: 'completed',
      reference,
      description: description || `Transfer to ${toUser.firstName} ${toUser.lastName}`,
      metadata: JSON.stringify({ 
        fromPhone: fromUser.phone,
        toPhone: toUser.phone
      })
    });

    // Update wallets
    await ledgerService.debitWallet(fromUserId, amount, reference);
    await ledgerService.creditWallet(toUser.id, amount, reference);

    // Send notifications
    await notificationService.sendPushNotification(fromUserId, {
      title: 'Transfer Sent',
      body: `You sent ${amount} RWF to ${toUser.firstName} ${toUser.lastName}`,
      data: { type: 'p2p_sent', reference }
    });

    await notificationService.sendPushNotification(toUser.id, {
      title: 'Money Received',
      body: `You received ${amount} RWF from ${fromUser.firstName} ${fromUser.lastName}`,
      data: { type: 'p2p_received', reference }
    });

    res.json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        reference,
        amount,
        recipient: {
          name: `${toUser.firstName} ${toUser.lastName}`,
          phone: toUser.phone
        }
      }
    } as APIResponse);

  } catch (error) {
    console.error('P2P transfer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process transfer'
    } as APIResponse);
  }
});

// QR payment
router.post('/qr-pay/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { qrData, amount }: QRPaymentRequest = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: 'QR data is required'
      } as APIResponse);
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as APIResponse);
    }

    // Parse QR data
    const qrPayment = paymentService.parseQRData(qrData);
    const paymentAmount = amount || qrPayment.amount || 0;

    if (!paymentAmount || paymentAmount <= 0 || paymentAmount > 1000000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment amount'
      } as APIResponse);
    }

    // Check balance
    const wallet = await storage.getWallet(userId);
    if (!wallet || parseFloat(wallet.balance) < paymentAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      } as APIResponse);
    }

    // Create transaction
    const reference = `QR_${Date.now()}_${userId}`;
    const transaction = await storage.createTransaction({
      fromWalletId: wallet.id,
      amount: paymentAmount.toString(),
      currency: 'RWF',
      type: 'qr_payment',
      status: 'completed',
      reference,
      description: `Payment to ${qrPayment.merchantName}`,
      metadata: JSON.stringify(qrPayment)
    });

    // Update ledger
    await ledgerService.debitWallet(userId, paymentAmount, reference);

    // Send notification
    await notificationService.sendPushNotification(userId, {
      title: 'Payment Successful',
      body: `You paid ${paymentAmount} RWF to ${qrPayment.merchantName}`,
      data: { type: 'qr_payment', reference }
    });

    res.json({
      success: true,
      message: 'Payment completed successfully',
      data: {
        reference,
        amount: paymentAmount,
        merchant: qrPayment.merchantName
      }
    } as APIResponse);

  } catch (error) {
    console.error('QR payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payment'
    } as APIResponse);
  }
});

// Get wallet balance
router.get('/balance/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const wallet = await storage.getWallet(userId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      } as APIResponse);
    }

    res.json({
      success: true,
      data: {
        balance: parseFloat(wallet.balance),
        currency: wallet.currency
      }
    } as APIResponse);

  } catch (error) {
    console.error('Balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance'
    } as APIResponse);
  }
});

export default router;
