import { Router } from 'express';
import { storage } from '../storage';
import type { APIResponse } from '../../shared/types';

const router = Router();

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as APIResponse);
    }

    const wallet = await storage.getWallet(userId);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          kycStatus: user.kycStatus,
          preferredLanguage: user.preferredLanguage,
          createdAt: user.createdAt
        },
        wallet: {
          balance: wallet?.balance || '0.00',
          currency: wallet?.currency || 'RWF'
        }
      }
    } as APIResponse);

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile'
    } as APIResponse);
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, email, preferredLanguage, address } = req.body;

    const updatedUser = await storage.updateUser(userId, {
      firstName,
      lastName,
      email,
      preferredLanguage,
      address
    });

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          phone: updatedUser.phone,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          preferredLanguage: updatedUser.preferredLanguage,
          address: updatedUser.address
        }
      }
    } as APIResponse);

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    } as APIResponse);
  }
});

// Get user notifications
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const notifications = await storage.getUserNotifications(userId);

    res.json({
      success: true,
      data: notifications
    } as APIResponse);

  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notifications'
    } as APIResponse);
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    await storage.markNotificationAsRead(parseInt(id));

    res.json({
      success: true,
      message: 'Notification marked as read'
    } as APIResponse);

  } catch (error) {
    console.error('Mark notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    } as APIResponse);
  }
});

// Get wallet balance
router.get('/wallet', async (req, res) => {
  try {
    const userId = req.user.userId;
    
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
        balance: wallet.balance,
        currency: wallet.currency,
        isActive: wallet.isActive
      }
    } as APIResponse);

  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve wallet information'
    } as APIResponse);
  }
});

export default router;
