const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const CardService = require('../services/CardService');
const storage = require('../storage/MemoryStorage');

const router = express.Router();

// Get user cards
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check authorization
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const cards = await CardService.getUserCards(userId);

    // Remove sensitive card data for API response
    const safeCards = cards.map(card => ({
      id: card.id,
      type: card.type,
      status: card.status,
      lastFourDigits: card.pan ? card.pan.slice(-4) : '****',
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cardholderName: card.cardholderName,
      brand: card.brand,
      isVirtual: card.isVirtual,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    }));

    res.json({
      success: true,
      cards: safeCards,
    });

  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cards',
    });
  }
});

// Create virtual card
router.post('/virtual', auth, [
  body('cardType').optional().isIn(['debit', 'prepaid']),
  body('currency').optional().isIn(['RWF', 'USD']),
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

    const userId = req.user.userId;
    const { cardType = 'prepaid', currency = 'RWF' } = req.body;

    // Check user KYC status
    const user = await storage.findUserById(userId);
    if (user.kycStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required to create cards',
      });
    }

    // Check if user already has maximum number of cards
    const existingCards = await CardService.getUserCards(userId);
    const activeCards = existingCards.filter(card => card.status === 'active');
    
    if (activeCards.length >= 3) { // Limit 3 active cards per user
      return res.status(400).json({
        success: false,
        message: 'Maximum number of active cards reached',
      });
    }

    // Create virtual card
    const cardData = {
      userId,
      type: cardType,
      currency,
      cardholderName: `${user.firstName} ${user.lastName}`.toUpperCase(),
      isVirtual: true,
    };

    const card = await CardService.createVirtualCard(cardData);

    // Return safe card data (without full PAN and CVV)
    const safeCard = {
      id: card.id,
      type: card.type,
      status: card.status,
      lastFourDigits: card.pan.slice(-4),
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cardholderName: card.cardholderName,
      brand: card.brand,
      currency: card.currency,
      isVirtual: card.isVirtual,
      createdAt: card.createdAt,
    };

    res.status(201).json({
      success: true,
      message: 'Virtual card created successfully',
      card: safeCard,
    });

  } catch (error) {
    console.error('Create virtual card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create virtual card',
    });
  }
});

// Get card details (including sensitive data for card owner)
router.get('/detail/:cardId', auth, async (req, res) => {
  try {
    const { cardId } = req.params;
    const userId = req.user.userId;

    const card = await CardService.getCard(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found',
      });
    }

    // Check authorization
    if (card.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // For card owner, return full details (masked)
    const cardDetails = {
      id: card.id,
      type: card.type,
      status: card.status,
      pan: `**** **** **** ${card.pan.slice(-4)}`,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cardholderName: card.cardholderName,
      brand: card.brand,
      currency: card.currency,
      isVirtual: card.isVirtual,
      balance: await CardService.getCardBalance(cardId),
      limits: card.limits,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };

    res.json({
      success: true,
      card: cardDetails,
    });

  } catch (error) {
    console.error('Get card details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve card details',
    });
  }
});

// Reveal full card details (PAN, CVV) - with additional security
router.post('/reveal/:cardId', auth, [
  body('pin').isLength({ min: 4, max: 6 }),
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

    const { cardId } = req.params;
    const { pin } = req.body;
    const userId = req.user.userId;

    // Verify user PIN
    const user = await storage.findUserById(userId);
    if (!user || !user.pin) {
      return res.status(400).json({
        success: false,
        message: 'PIN not set',
      });
    }

    const bcrypt = require('bcrypt');
    const isValidPin = await bcrypt.compare(pin, user.pin);
    if (!isValidPin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN',
      });
    }

    const card = await CardService.getCard(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found',
      });
    }

    // Check authorization
    if (card.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (card.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Card is not active',
      });
    }

    // Decrypt and return full card details
    const fullCardDetails = await CardService.getFullCardDetails(cardId);

    res.json({
      success: true,
      card: {
        id: card.id,
        pan: fullCardDetails.pan,
        cvv: fullCardDetails.cvv,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        cardholderName: card.cardholderName,
        // These details should be shown for limited time only
        expiresAt: new Date(Date.now() + 30000), // 30 seconds
      },
    });

  } catch (error) {
    console.error('Reveal card details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reveal card details',
    });
  }
});

// Block/Unblock card
router.post('/:cardId/block', auth, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { block = true, reason } = req.body;
    const userId = req.user.userId;

    const card = await CardService.getCard(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found',
      });
    }

    // Check authorization
    if (card.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const result = await CardService.updateCardStatus(
      cardId, 
      block ? 'blocked' : 'active',
      reason
    );

    if (result.success) {
      res.json({
        success: true,
        message: `Card ${block ? 'blocked' : 'unblocked'} successfully`,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || `Failed to ${block ? 'block' : 'unblock'} card`,
      });
    }

  } catch (error) {
    console.error('Block/Unblock card error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update card status',
    });
  }
});

// Update card limits
router.put('/:cardId/limits', auth, [
  body('dailyLimit').optional().isFloat({ min: 0, max: 1000000 }),
  body('monthlyLimit').optional().isFloat({ min: 0, max: 5000000 }),
  body('transactionLimit').optional().isFloat({ min: 0, max: 1000000 }),
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

    const { cardId } = req.params;
    const { dailyLimit, monthlyLimit, transactionLimit } = req.body;
    const userId = req.user.userId;

    const card = await CardService.getCard(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found',
      });
    }

    // Check authorization
    if (card.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const newLimits = {
      ...(dailyLimit !== undefined && { dailyLimit }),
      ...(monthlyLimit !== undefined && { monthlyLimit }),
      ...(transactionLimit !== undefined && { transactionLimit }),
    };

    const result = await CardService.updateCardLimits(cardId, newLimits);

    if (result.success) {
      res.json({
        success: true,
        message: 'Card limits updated successfully',
        limits: result.limits,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to update card limits',
      });
    }

  } catch (error) {
    console.error('Update card limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update card limits',
    });
  }
});

// Get card transactions
router.get('/:cardId/transactions', auth, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.userId;

    const card = await CardService.getCard(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found',
      });
    }

    // Check authorization
    if (card.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const transactions = await CardService.getCardTransactions(cardId, {
      page: parseInt(page),
      limit: parseInt(limit),
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
    console.error('Get card transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve card transactions',
    });
  }
});

module.exports = router;
