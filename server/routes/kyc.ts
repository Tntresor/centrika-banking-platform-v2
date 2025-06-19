import { Router } from 'express';
import { storage } from '../storage';
import { kycService } from '../services/kycService';
import { notificationService } from '../services/notificationService';
import type { KYCRequest, APIResponse } from '../../shared/types';

const router = Router();

// Submit KYC documents
router.post('/submit', async (req, res) => {
  try {
    const { documentType, documentImage, selfieImage } = req.body as KYCRequest;
    const userId = req.user.userId;

    if (!documentType || !documentImage || !selfieImage) {
      return res.status(400).json({
        success: false,
        error: 'Document type, document image, and selfie are required'
      } as APIResponse);
    }

    // Process KYC documents
    const result = await kycService.processKYCDocuments({
      userId,
      documentType,
      documentImage,
      selfieImage
    });

    // Update user KYC status
    await storage.updateUser(userId, { kycStatus: result.status });

    // Send notification
    await notificationService.sendKYCStatusNotification(userId, result.status);

    res.json({
      success: true,
      data: result
    } as APIResponse);

  } catch (error) {
    console.error('KYC submission error:', error);
    res.status(500).json({
      success: false,
      error: 'KYC submission failed'
    } as APIResponse);
  }
});

// Get KYC status
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await storage.getUser(userId);
    const kycDocuments = await storage.getKYCDocuments(userId);

    res.json({
      success: true,
      data: {
        status: user?.kycStatus || 'pending',
        documents: kycDocuments.map(doc => ({
          id: doc.id,
          documentType: doc.documentType,
          verificationStatus: doc.verificationStatus,
          verificationScore: doc.verificationScore,
          reviewNotes: doc.reviewNotes,
          createdAt: doc.createdAt
        }))
      }
    } as APIResponse);

  } catch (error) {
    console.error('KYC status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve KYC status'
    } as APIResponse);
  }
});

// Get pending KYC documents (admin only)
router.get('/pending', async (req, res) => {
  try {
    // This endpoint should be protected with admin middleware
    const pendingDocuments = await storage.getPendingKYCDocuments();

    res.json({
      success: true,
      data: pendingDocuments
    } as APIResponse);

  } catch (error) {
    console.error('Pending KYC error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pending KYC documents'
    } as APIResponse);
  }
});

// Review KYC document (admin only)
router.put('/review/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const reviewerId = req.admin?.adminId;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status (approved/rejected) is required'
      } as APIResponse);
    }

    // Update KYC document
    const kycDoc = await storage.updateKYCDocument(parseInt(id), {
      verificationStatus: status,
      reviewNotes: notes,
      reviewedBy: reviewerId
    });

    // Update user's overall KYC status
    await storage.updateUser(kycDoc.userId, { kycStatus: status });

    // Send notification to user
    await notificationService.sendKYCStatusNotification(kycDoc.userId, status);

    // Create audit log
    await storage.createAuditLog({
      adminUserId: reviewerId,
      action: 'kyc_review',
      entity: 'kyc_document',
      entityId: parseInt(id),
      newValues: { status, notes }
    });

    res.json({
      success: true,
      data: kycDoc
    } as APIResponse);

  } catch (error) {
    console.error('KYC review error:', error);
    res.status(500).json({
      success: false,
      error: 'KYC review failed'
    } as APIResponse);
  }
});

export default router;
