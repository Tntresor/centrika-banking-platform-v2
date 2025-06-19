import { Router } from 'express';
import { storage } from '../storage';
import { cardService } from '../services/cardService';
import { notificationService } from '../services/notificationService';
import type { CardGenerationRequest, APIResponse } from '../../shared/types';

const router = Router();

// Get user cards
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const cards = await storage.getUserCards(userId);

    res.json({
      success: true,
      data: cards.map(card => ({
        id: card.id,
        maskedPan: card.maskedPan,
        expiryDate: card.expiryDate,
        cardType: card.cardType,
        provider: card.provider,
        isActive: card.isActive,
        createdAt: card.createdAt
      }))
    } as APIResponse);

  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cards'
    } as APIResponse);
  }
});

// Generate new virtual card
router.post('/generate', async (req, res) => {
  try {
    const { cardType = 'virtual' } = req.body as CardGenerationRequest;
    const userId = req.user.userId;

    // Check if user has completed KYC
    const user = await storage.getUser(userId);
    if (!user || user.kycStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'KYC verification must be completed before generating cards'
      } as APIResponse);
    }

    // Check if user already has a virtual card
    const existingCards = await storage.getUserCards(userId);
    const hasVirtualCard = existingCards.some(card => card.cardType === 'virtual' && card.isActive);
    
    if (hasVirtualCard) {
      return res.status(400).json({
        success: false,
        error: 'User already has an active virtual card'
      } as APIResponse);
    }

    // Generate virtual card
    const cardData = await cardService.generateVirtualCard(userId, cardType);

    // Send notification
    await notificationService.sendCardNotification(userId, cardData.maskedPan, 'created');

    res.json({
      success: true,
      data: {
        id: cardData.id,
        maskedPan: cardData.maskedPan,
        expiryDate: cardData.expiryDate,
        cardType: cardData.cardType,
        provider: cardData.provider,
        isActive: cardData.isActive
      }
    } as APIResponse);

  } catch (error) {
    console.error('Card generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate card'
    } as APIResponse);
  }
});

// Get card details (with sensitive data for authorized requests)
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const card = await storage.getCard(parseInt(id));
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      } as APIResponse);
    }

    // Verify card belongs to user
    if (card.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      } as APIResponse);
    }

    // Decrypt card details
    const cardDetails = await cardService.getCardDetails(card.id);

    res.json({
      success: true,
      data: cardDetails
    } as APIResponse);

  } catch (error) {
    console.error('Card details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve card details'
    } as APIResponse);
  }
});

// Activate/Deactivate card
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const userId = req.user.userId;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Valid isActive status is required'
      } as APIResponse);
    }

    const card = await storage.getCard(parseInt(id));
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      } as APIResponse);
    }

    // Verify card belongs to user
    if (card.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      } as APIResponse);
    }

    // Update card status
    const updatedCard = await cardService.updateCardStatus(card.id, isActive);

    // Send notification
    await notificationService.sendCardNotification(
      userId, 
      updatedCard.maskedPan,
      isActive ? 'activated' : 'deactivated'
    );

    res.json({
      success: true,
      data: {
        id: updatedCard.id,
        maskedPan: updatedCard.maskedPan,
        isActive: updatedCard.isActive
      }
    } as APIResponse);

  } catch (error) {
    console.error('Card status update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update card status'
    } as APIResponse);
  }
});

export default router;
