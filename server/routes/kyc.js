const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const auth = require('../middleware/auth');
const KYCService = require('../services/KYCService');
const storage = require('../storage/MemoryStorage');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Process KYC with document and selfie images
router.post('/process', auth, [
  body('documentImage').notEmpty(),
  body('faceImage').notEmpty(),
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

    const { documentImage, faceImage } = req.body;
    const userId = req.user.userId;

    // Process KYC
    const kycResult = await KYCService.processKYC({
      userId,
      documentImage,
      faceImage,
    });

    if (kycResult.success) {
      // Update user KYC status
      await storage.updateUser(userId, {
        kycStatus: 'approved',
        kycData: kycResult.extractedData,
        kycCompletedAt: new Date(),
      });

      res.json({
        success: true,
        message: 'KYC processed successfully',
        extractedData: kycResult.extractedData,
        faceMatch: kycResult.faceMatch,
        documentVerification: kycResult.documentVerification,
      });
    } else {
      // Update user KYC status to pending for manual review
      await storage.updateUser(userId, {
        kycStatus: 'pending',
        kycFailureReason: kycResult.reason,
      });

      res.status(400).json({
        success: false,
        message: kycResult.message || 'KYC verification failed',
        reason: kycResult.reason,
      });
    }

  } catch (error) {
    console.error('KYC processing error:', error);
    res.status(500).json({
      success: false,
      message: 'KYC processing failed',
    });
  }
});

// Extract document data using OCR
router.post('/extract-document', auth, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Document image is required',
      });
    }

    const extractedData = await KYCService.extractDocumentData(req.file.buffer);

    res.json({
      success: true,
      extractedData,
    });

  } catch (error) {
    console.error('Document extraction error:', error);
    res.status(500).json({
      success: false,
      message: 'Document extraction failed',
    });
  }
});

// Verify face liveness
router.post('/verify-liveness', auth, [
  body('image').notEmpty(),
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

    const { image } = req.body;
    const isLive = await KYCService.verifyLiveness(image);

    res.json({
      success: true,
      isLive,
      confidence: isLive ? 'HIGH' : 'LOW',
    });

  } catch (error) {
    console.error('Liveness verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Liveness verification failed',
    });
  }
});

// Compare faces
router.post('/compare-faces', auth, [
  body('sourceImage').notEmpty(),
  body('targetImage').notEmpty(),
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

    const { sourceImage, targetImage } = req.body;
    const comparison = await KYCService.compareFaces(sourceImage, targetImage);

    res.json({
      success: true,
      similarity: comparison.similarity,
      confidence: comparison.confidence,
      match: comparison.similarity >= 85, // 85% threshold
    });

  } catch (error) {
    console.error('Face comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Face comparison failed',
    });
  }
});

// Get KYC status
router.get('/status/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if requesting user is the same or has admin privileges
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const user = await storage.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      status: user.kycStatus,
      completedAt: user.kycCompletedAt,
      failureReason: user.kycFailureReason,
    });

  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC status',
    });
  }
});

// Submit for manual review
router.post('/manual-review', auth, [
  body('documentImage').notEmpty(),
  body('faceImage').notEmpty(),
  body('reason').optional().isString(),
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
    const { documentImage, faceImage, reason } = req.body;

    // Submit for manual review
    const reviewId = await KYCService.submitForManualReview(userId, {
      documentImage,
      faceImage,
      reason,
      submittedAt: new Date(),
    });

    // Update user status
    await storage.updateUser(userId, {
      kycStatus: 'pending',
      manualReviewId: reviewId,
    });

    res.json({
      success: true,
      message: 'Submitted for manual review',
      reviewId,
    });

  } catch (error) {
    console.error('Manual review submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit for manual review',
    });
  }
});

// Admin endpoints for back-office

// Approve KYC
router.post('/approve/:userId', auth, async (req, res) => {
  try {
    // Check admin privileges
    if (req.user.role !== 'admin' && req.user.role !== 'ops_agent') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { userId } = req.params;
    const { notes } = req.body;

    const user = await storage.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update user KYC status
    await storage.updateUser(userId, {
      kycStatus: 'approved',
      kycApprovedBy: req.user.userId,
      kycApprovedAt: new Date(),
      kycNotes: notes,
    });

    // Log audit trail
    await KYCService.logAuditEvent(userId, 'KYC_APPROVED', {
      approvedBy: req.user.userId,
      notes,
    });

    res.json({
      success: true,
      message: 'KYC approved successfully',
    });

  } catch (error) {
    console.error('KYC approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve KYC',
    });
  }
});

// Reject KYC
router.post('/reject/:userId', auth, [
  body('reason').notEmpty(),
], async (req, res) => {
  try {
    // Check admin privileges
    if (req.user.role !== 'admin' && req.user.role !== 'ops_agent') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array(),
      });
    }

    const { userId } = req.params;
    const { reason, notes } = req.body;

    const user = await storage.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update user KYC status
    await storage.updateUser(userId, {
      kycStatus: 'rejected',
      kycRejectedBy: req.user.userId,
      kycRejectedAt: new Date(),
      kycFailureReason: reason,
      kycNotes: notes,
    });

    // Log audit trail
    await KYCService.logAuditEvent(userId, 'KYC_REJECTED', {
      rejectedBy: req.user.userId,
      reason,
      notes,
    });

    res.json({
      success: true,
      message: 'KYC rejected',
    });

  } catch (error) {
    console.error('KYC rejection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject KYC',
    });
  }
});

module.exports = router;
