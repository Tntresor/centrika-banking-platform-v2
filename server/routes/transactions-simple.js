const express = require('express');
const { storage } = require('../storage');

const router = express.Router();

// Get user transactions
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const wallet = await storage.getWallet(userId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    const transactions = await storage.getTransactions(wallet.id);
    
    res.json({
      success: true,
      transactions: transactions.map(tx => ({
        id: tx.id,
        amount: tx.amount,
        type: tx.type,
        status: tx.status,
        description: tx.description,
        createdAt: tx.created_at,
        isIncoming: tx.is_incoming
      }))
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions'
    });
  }
});

// Create transaction
router.post('/', async (req, res) => {
  try {
    const { userId, type, amount, description, recipientPhone } = req.body;
    
    const wallet = await storage.getWallet(userId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    const transaction = await storage.createTransaction({
      walletId: wallet.id,
      type,
      amount,
      description,
      recipientPhone,
      reference: `TXN${Date.now()}`,
      status: 'completed'
    });

    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        reference: transaction.reference,
        createdAt: transaction.created_at
      }
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Transaction failed'
    });
  }
});

module.exports = router;