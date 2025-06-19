const express = require('express');
const { storage } = require('../storage');

const router = express.Router();

// MoMo deposit
router.post('/deposit', async (req, res) => {
  try {
    const { userId, amount, phoneNumber } = req.body;
    
    if (!userId || !amount || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const wallet = await storage.getWallet(userId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // Create deposit transaction
    const transaction = await storage.createTransaction({
      walletId: wallet.id,
      type: 'deposit',
      amount,
      description: `MoMo deposit from ${phoneNumber}`,
      reference: `MOMO_DEP_${Date.now()}`,
      status: 'completed',
      isIncoming: true
    });

    // Update wallet balance
    const newBalance = (parseFloat(wallet.balance) + parseFloat(amount)).toFixed(2);
    await storage.updateWalletBalance(wallet.id, newBalance);

    res.json({
      success: true,
      message: 'Deposit successful',
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        reference: transaction.reference,
        status: transaction.status
      },
      newBalance
    });

  } catch (error) {
    console.error('MoMo deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Deposit failed'
    });
  }
});

// MoMo withdrawal
router.post('/withdraw', async (req, res) => {
  try {
    const { userId, amount, phoneNumber } = req.body;
    
    if (!userId || !amount || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const wallet = await storage.getWallet(userId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // Check sufficient balance
    if (parseFloat(wallet.balance) < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    // Create withdrawal transaction
    const transaction = await storage.createTransaction({
      walletId: wallet.id,
      type: 'withdrawal',
      amount,
      description: `MoMo withdrawal to ${phoneNumber}`,
      reference: `MOMO_WD_${Date.now()}`,
      status: 'completed',
      isIncoming: false
    });

    // Update wallet balance
    const newBalance = (parseFloat(wallet.balance) - parseFloat(amount)).toFixed(2);
    await storage.updateWalletBalance(wallet.id, newBalance);

    res.json({
      success: true,
      message: 'Withdrawal successful',
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        reference: transaction.reference,
        status: transaction.status
      },
      newBalance
    });

  } catch (error) {
    console.error('MoMo withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Withdrawal failed'
    });
  }
});

module.exports = router;