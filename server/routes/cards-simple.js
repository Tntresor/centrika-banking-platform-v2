const express = require('express');
const { storage } = require('../storage');

const router = express.Router();

// Get user cards
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const cards = await storage.getUserCards(userId);
    
    res.json({
      success: true,
      cards: cards.map(card => ({
        id: card.id,
        maskedPan: card.masked_pan,
        cardType: card.card_type,
        provider: card.provider,
        expiryDate: card.expiry_date,
        isActive: card.is_active,
        createdAt: card.created_at
      }))
    });

  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cards'
    });
  }
});

// Generate new card
router.post('/generate', async (req, res) => {
  try {
    const { userId, cardType = 'virtual' } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Generate card details
    const maskedPan = `****-****-****-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 3);
    const formattedExpiry = `${(expiryDate.getMonth() + 1).toString().padStart(2, '0')}/${expiryDate.getFullYear().toString().substr(-2)}`;

    const card = await storage.createCard({
      userId,
      maskedPan,
      cardType,
      provider: 'unionpay',
      expiryDate: formattedExpiry
    });

    res.json({
      success: true,
      message: 'Card generated successfully',
      card: {
        id: card.id,
        maskedPan: card.masked_pan,
        cardType: card.card_type,
        provider: card.provider,
        expiryDate: card.expiry_date,
        isActive: card.is_active
      }
    });

  } catch (error) {
    console.error('Generate card error:', error);
    res.status(500).json({
      success: false,
      message: 'Card generation failed'
    });
  }
});

module.exports = router;