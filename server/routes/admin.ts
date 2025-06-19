import { Router } from 'express';
import { storage } from '../storage';
import { reportingService } from '../services/reportingService';
import { adminAuthMiddleware } from '../middleware/auth';
import type { APIResponse, MetricsData, PaginatedResponse } from '../../shared/types';

const router = Router();

// Apply admin authentication middleware to all routes
router.use(adminAuthMiddleware);

// Get dashboard metrics
router.get('/metrics', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const metrics = await reportingService.getDashboardMetrics(today);

    res.json({
      success: true,
      data: metrics
    } as APIResponse<MetricsData>);

  } catch (error) {
    console.error('Admin metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics'
    } as APIResponse);
  }
});

// Search users
router.get('/users', async (req, res) => {
  try {
    const { query = '', status, page = 1, limit = 20 } = req.query;
    
    const users = await storage.searchUsers(query as string, status as string);
    
    // Simple pagination
    const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
    const paginatedUsers = users.slice(startIndex, startIndex + parseInt(limit as string));

    const response: PaginatedResponse<any> = {
      data: paginatedUsers.map(user => ({
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        kycStatus: user.kycStatus,
        isActive: user.isActive,
        createdAt: user.createdAt
      })),
      total: users.length,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      hasNext: startIndex + parseInt(limit as string) < users.length,
      hasPrev: parseInt(page as string) > 1
    };

    res.json({
      success: true,
      data: response
    } as APIResponse);

  } catch (error) {
    console.error('Admin user search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    } as APIResponse);
  }
});

// Get user details
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await storage.getUser(parseInt(id));
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as APIResponse);
    }

    const wallet = await storage.getWallet(user.id);
    const kycDocuments = await storage.getKYCDocuments(user.id);
    const cards = await storage.getUserCards(user.id);
    const recentTransactions = await storage.getTransactions(wallet?.id || 0, 10);

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
          address: user.address,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        wallet: wallet ? {
          balance: wallet.balance,
          currency: wallet.currency,
          isActive: wallet.isActive
        } : null,
        kycDocuments: kycDocuments.map(doc => ({
          id: doc.id,
          documentType: doc.documentType,
          verificationStatus: doc.verificationStatus,
          verificationScore: doc.verificationScore,
          reviewNotes: doc.reviewNotes,
          createdAt: doc.createdAt
        })),
        cards: cards.map(card => ({
          id: card.id,
          maskedPan: card.maskedPan,
          cardType: card.cardType,
          isActive: card.isActive,
          createdAt: card.createdAt
        })),
        recentTransactions: recentTransactions.map(tx => ({
          id: tx.id,
          amount: tx.amount,
          type: tx.type,
          status: tx.status,
          description: tx.description,
          createdAt: tx.createdAt
        }))
      }
    } as APIResponse);

  } catch (error) {
    console.error('Admin user details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user details'
    } as APIResponse);
  }
});

// Manual wallet adjustment (sandbox only)
router.post('/wallets/:id/adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, reason } = req.body;
    const adminId = req.admin.adminId;

    if (!amount || !type || !['credit', 'debit'].includes(type) || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount, type (credit/debit), and reason are required'
      } as APIResponse);
    }

    const wallet = await storage.getWallet(parseInt(id));
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      } as APIResponse);
    }

    const currentBalance = parseFloat(wallet.balance);
    const adjustmentAmount = parseFloat(amount);
    const newBalance = type === 'credit' 
      ? currentBalance + adjustmentAmount 
      : currentBalance - adjustmentAmount;

    if (newBalance < 0) {
      return res.status(400).json({
        success: false,
        error: 'Adjustment would result in negative balance'
      } as APIResponse);
    }

    // Update wallet balance
    const updatedWallet = await storage.updateWalletBalance(wallet.id, newBalance.toString());

    // Create adjustment transaction
    const transaction = await storage.createTransaction({
      [type === 'credit' ? 'toWalletId' : 'fromWalletId']: wallet.id,
      amount: adjustmentAmount.toString(),
      currency: wallet.currency,
      type: 'adjustment',
      status: 'completed',
      reference: `ADJ-${Date.now()}-${adminId}`,
      description: `Manual ${type}: ${reason}`,
      metadata: {
        adminId,
        reason,
        adjustmentType: type
      }
    });

    // Create audit log
    await storage.createAuditLog({
      adminUserId: adminId,
      userId: wallet.userId,
      action: 'wallet_adjustment',
      entity: 'wallet',
      entityId: wallet.id,
      oldValues: { balance: wallet.balance },
      newValues: { balance: newBalance.toString() }
    });

    res.json({
      success: true,
      data: {
        wallet: {
          id: updatedWallet.id,
          balance: updatedWallet.balance,
          currency: updatedWallet.currency
        },
        transaction
      }
    } as APIResponse);

  } catch (error) {
    console.error('Wallet adjustment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to adjust wallet balance'
    } as APIResponse);
  }
});

// Get audit logs
router.get('/audit', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const auditLogs = await storage.getAuditLogs(parseInt(limit as string), offset);

    res.json({
      success: true,
      data: auditLogs
    } as APIResponse);

  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs'
    } as APIResponse);
  }
});

// Generate BNR report
router.post('/reports/bnr', async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      } as APIResponse);
    }

    const reportData = await reportingService.generateBNRReport(date);

    res.json({
      success: true,
      data: reportData
    } as APIResponse);

  } catch (error) {
    console.error('BNR report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate BNR report'
    } as APIResponse);
  }
});

export default router;
