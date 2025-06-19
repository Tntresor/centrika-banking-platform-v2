import { Router } from 'express';
import { storage } from '../storage';
import { ledgerService } from '../services/ledgerService';
import { notificationService } from '../services/notificationService';
import type { P2PTransferRequest, QRPaymentRequest, APIResponse } from '../../shared/types';

const router = Router();

// Get transaction history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const wallet = await storage.getWallet(userId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      } as APIResponse);
    }

    const transactions = await storage.getTransactions(wallet.id, limit);

    res.json({
      success: true,
      data: transactions.map(tx => ({
        id: tx.id,
        amount: tx.amount,
        currency: tx.currency,
        type: tx.type,
        status: tx.status,
        description: tx.description,
        reference: tx.reference,
        createdAt: tx.createdAt,
        isIncoming: tx.toWalletId === wallet.id
      }))
    } as APIResponse);

  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve transaction history'
    } as APIResponse);
  }
});

// P2P Transfer
router.post('/p2p', async (req, res) => {
  try {
    const { recipientPhone, amount, description } = req.body as P2PTransferRequest;
    const userId = req.user.userId;

    if (!recipientPhone || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid recipient phone and amount are required'
      } as APIResponse);
    }

    // Check BNR limits (1M RWF per transaction)
    if (amount > 1000000) {
      return res.status(400).json({
        success: false,
        error: 'Transaction amount exceeds BNR Tier II limit (1,000,000 RWF)'
      } as APIResponse);
    }

    // Find recipient
    const recipient = await storage.getUserByPhone(recipientPhone);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found'
      } as APIResponse);
    }

    // Check if recipient has completed KYC
    if (recipient.kycStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Recipient must complete KYC verification'
      } as APIResponse);
    }

    // Process P2P transfer
    const result = await ledgerService.processP2PTransfer(
      userId,
      recipient.id,
      amount,
      description || 'P2P Transfer'
    );

    // Send notifications
    await notificationService.sendTransactionNotification(userId, result.transaction, 'sent');
    await notificationService.sendTransactionNotification(recipient.id, result.transaction, 'received');

    res.json({
      success: true,
      data: result
    } as APIResponse);

  } catch (error) {
    console.error('P2P transfer error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'P2P transfer failed'
    } as APIResponse);
  }
});

// QR Payment
router.post('/qr-pay', async (req, res) => {
  try {
    const { qrData, amount } = req.body as QRPaymentRequest;
    const userId = req.user.userId;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: 'QR data is required'
      } as APIResponse);
    }

    // Parse QR data (EMVCo format simulation)
    const qrPayload = parseQRData(qrData);
    
    if (!qrPayload.merchantId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code format'
      } as APIResponse);
    }

    const paymentAmount = amount || qrPayload.amount;
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid payment amount is required'
      } as APIResponse);
    }

    // Check BNR limits
    if (paymentAmount > 1000000) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount exceeds BNR Tier II limit (1,000,000 RWF)'
      } as APIResponse);
    }

    // Process QR payment
    const result = await ledgerService.processQRPayment(
      userId,
      qrPayload.merchantId,
      paymentAmount,
      qrPayload.description || 'QR Payment'
    );

    // Send notification
    await notificationService.sendTransactionNotification(userId, result.transaction, 'payment');

    res.json({
      success: true,
      data: result
    } as APIResponse);

  } catch (error) {
    console.error('QR payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'QR payment failed'
    } as APIResponse);
  }
});

// Get transaction details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const transaction = await storage.getTransaction(parseInt(id));
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      } as APIResponse);
    }

    // Verify user has access to this transaction
    const wallet = await storage.getWallet(userId);
    if (!wallet || (transaction.fromWalletId !== wallet.id && transaction.toWalletId !== wallet.id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      } as APIResponse);
    }

    res.json({
      success: true,
      data: {
        ...transaction,
        isIncoming: transaction.toWalletId === wallet.id
      }
    } as APIResponse);

  } catch (error) {
    console.error('Transaction details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve transaction details'
    } as APIResponse);
  }
});

// Helper function to parse QR data
function parseQRData(qrData: string) {
  try {
    // For demo purposes, assume QR data is JSON
    const parsed = JSON.parse(qrData);
    return {
      merchantId: parsed.merchantId || parsed.merchant_id,
      amount: parsed.amount ? parseFloat(parsed.amount) : null,
      description: parsed.description || parsed.desc,
      reference: parsed.reference || parsed.ref
    };
  } catch {
    // If not JSON, try to parse as simple format
    return {
      merchantId: qrData.includes('merchant:') ? qrData.split('merchant:')[1]?.split('|')[0] : null,
      amount: qrData.includes('amount:') ? parseFloat(qrData.split('amount:')[1]?.split('|')[0] || '0') : null,
      description: qrData.includes('desc:') ? qrData.split('desc:')[1]?.split('|')[0] : null,
      reference: qrData.includes('ref:') ? qrData.split('ref:')[1]?.split('|')[0] : null
    };
  }
}

export default router;
