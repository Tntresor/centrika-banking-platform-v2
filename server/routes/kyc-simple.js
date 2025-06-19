const express = require('express');
const { storage } = require('../storage');

const router = express.Router();

// Submit KYC documents
router.post('/submit', async (req, res) => {
  try {
    const { userId, documentType, documentUrl, selfieUrl } = req.body;

    if (!userId || !documentType || !documentUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create KYC document record
    const kycDocument = await storage.createKYCDocument({
      userId,
      documentType,
      documentUrl,
      verificationStatus: 'pending',
      verificationScore: 85.5, // Simulated ML score
    });

    // If selfie provided, create selfie record
    if (selfieUrl) {
      await storage.createKYCDocument({
        userId,
        documentType: 'selfie',
        documentUrl: selfieUrl,
        verificationStatus: 'pending',
        verificationScore: 92.3,
      });
    }

    res.json({
      success: true,
      message: 'KYC documents submitted successfully',
      verificationId: kycDocument.id,
      status: 'pending'
    });

  } catch (error) {
    console.error('KYC submission error:', error);
    res.status(500).json({
      success: false,
      message: 'KYC submission failed'
    });
  }
});

// Get KYC status
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const kycDocuments = await storage.getKYCDocuments(userId);
    
    if (kycDocuments.length === 0) {
      return res.json({
        success: true,
        status: 'not_submitted',
        documents: []
      });
    }

    res.json({
      success: true,
      status: kycDocuments[0].verification_status,
      documents: kycDocuments.map(doc => ({
        id: doc.id,
        type: doc.document_type,
        status: doc.verification_status,
        score: doc.verification_score,
        submittedAt: doc.created_at
      }))
    });

  } catch (error) {
    console.error('KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC status'
    });
  }
});

module.exports = router;