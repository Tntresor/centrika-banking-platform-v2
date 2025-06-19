import { storage } from '../storage';
import type { Transaction } from '../../shared/schema';

class LedgerService {
  async processP2PTransfer(
    senderId: number,
    recipientId: number,
    amount: number,
    description: string
  ): Promise<{ transaction: Transaction; newSenderBalance: string; newRecipientBalance: string }> {
    // Get sender and recipient wallets
    const senderWallet = await storage.getWallet(senderId);
    const recipientWallet = await storage.getWallet(recipientId);

    if (!senderWallet || !recipientWallet) {
      throw new Error('Wallet not found');
    }

    // Check sender balance
    const senderBalance = parseFloat(senderWallet.balance);
    if (senderBalance < amount) {
      throw new Error('Insufficient balance');
    }

    // Check BNR daily limit (simplified - in production, check actual daily transactions)
    if (amount > 1000000) {
      throw new Error('Amount exceeds daily limit');
    }

    // Check recipient balance limit (2M RWF for Tier II)
    const recipientBalance = parseFloat(recipientWallet.balance);
    if (recipientBalance + amount > 2000000) {
      throw new Error('Recipient balance would exceed Tier II limit (2,000,000 RWF)');
    }

    // Create transaction record
    const transaction = await storage.createTransaction({
      fromWalletId: senderWallet.id,
      toWalletId: recipientWallet.id,
      amount: amount.toString(),
      currency: 'RWF',
      type: 'transfer',
      status: 'completed',
      reference: `TRF-${Date.now()}-${senderId}`,
      description
    });

    // Update wallet balances
    const newSenderBalance = (senderBalance - amount).toString();
    const newRecipientBalance = (recipientBalance + amount).toString();

    await storage.updateWalletBalance(senderWallet.id, newSenderBalance);
    await storage.updateWalletBalance(recipientWallet.id, newRecipientBalance);

    return {
      transaction,
      newSenderBalance,
      newRecipientBalance
    };
  }

  async processQRPayment(
    payerId: number,
    merchantId: string,
    amount: number,
    description: string
  ): Promise<{ transaction: Transaction; newBalance: string }> {
    // Get payer wallet
    const payerWallet = await storage.getWallet(payerId);
    if (!payerWallet) {
      throw new Error('Wallet not found');
    }

    // Check balance
    const currentBalance = parseFloat(payerWallet.balance);
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }

    // Check BNR limits
    if (amount > 1000000) {
      throw new Error('Payment amount exceeds daily limit');
    }

    // Create transaction record
    const transaction = await storage.createTransaction({
      fromWalletId: payerWallet.id,
      amount: amount.toString(),
      currency: 'RWF',
      type: 'payment',
      status: 'completed',
      reference: `QR-${Date.now()}-${payerId}`,
      description,
      metadata: {
        merchantId,
        paymentMethod: 'qr'
      }
    });

    // Update wallet balance
    const newBalance = (currentBalance - amount).toString();
    await storage.updateWalletBalance(payerWallet.id, newBalance);

    return {
      transaction,
      newBalance
    };
  }

  async processDeposit(
    userId: number,
    amount: number,
    reference: string,
    description: string
  ): Promise<{ transaction: Transaction; newBalance: string }> {
    // Get user wallet
    const wallet = await storage.getWallet(userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Check BNR balance limit (2M RWF for Tier II)
    const currentBalance = parseFloat(wallet.balance);
    if (currentBalance + amount > 2000000) {
      throw new Error('Deposit would exceed Tier II balance limit (2,000,000 RWF)');
    }

    // Create transaction record
    const transaction = await storage.createTransaction({
      toWalletId: wallet.id,
      amount: amount.toString(),
      currency: 'RWF',
      type: 'deposit',
      status: 'completed',
      reference,
      description
    });

    // Update wallet balance
    const newBalance = (currentBalance + amount).toString();
    await storage.updateWalletBalance(wallet.id, newBalance);

    return {
      transaction,
      newBalance
    };
  }

  async processWithdrawal(
    userId: number,
    amount: number,
    reference: string,
    description: string
  ): Promise<{ transaction: Transaction; newBalance: string }> {
    // Get user wallet
    const wallet = await storage.getWallet(userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Check balance
    const currentBalance = parseFloat(wallet.balance);
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }

    // Create transaction record
    const transaction = await storage.createTransaction({
      fromWalletId: wallet.id,
      amount: amount.toString(),
      currency: 'RWF',
      type: 'withdrawal',
      status: 'completed',
      reference,
      description
    });

    // Update wallet balance
    const newBalance = (currentBalance - amount).toString();
    await storage.updateWalletBalance(wallet.id, newBalance);

    return {
      transaction,
      newBalance
    };
  }

  async getAccountBalance(userId: number): Promise<{ balance: string; currency: string }> {
    const wallet = await storage.getWallet(userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return {
      balance: wallet.balance,
      currency: wallet.currency
    };
  }

  async getTransactionHistory(userId: number, limit = 50): Promise<Transaction[]> {
    const wallet = await storage.getWallet(userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return await storage.getTransactions(wallet.id, limit);
  }

  // Double-entry bookkeeping validation
  async validateLedgerIntegrity(): Promise<boolean> {
    try {
      // This would typically involve complex queries to ensure
      // that all debits equal credits across all transactions
      // For now, we'll return true as a placeholder
      return true;
    } catch (error) {
      console.error('Ledger integrity check failed:', error);
      return false;
    }
  }
}

export const ledgerService = new LedgerService();
