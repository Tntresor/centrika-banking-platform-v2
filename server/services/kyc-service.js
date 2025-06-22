const { AppError, ErrorCodes } = require('../utils/errors');
const { Logger } = require('../utils/logger');

/**
 * Service for Know Your Customer (KYC) operations
 */
class KycService {
  constructor(storage, auditService) {
    this.storage = storage;
    this.auditService = auditService;
    this.logger = new Logger('KYCService');
  }
  
  /**
   * Verify a customer's identity using provided documents
   */
  async verifyCustomer(userId, documentType, documentData, ipAddress) {
    return await this.storage.executeTransaction(async (client) => {
      // Store verification attempt
      const verificationResult = await client.query(
        'INSERT INTO kyc_documents (user_id, document_type, status, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
        [userId, documentType, 'pending']
      );
      
      const verificationId = verificationResult.rows[0].id;
      
      // Log the verification attempt
      await this.auditService.log('kyc_verification_initiated', userId, {
        documentType,
        verificationId,
        ip: ipAddress
      }, client);
      
      try {
        // Call external verification service (simulated)
        const externalResult = await this.callExternalVerification(documentType, documentData);
        
        // Update verification status
        await client.query(
          'UPDATE kyc_documents SET status = $1, verified_at = NOW(), document_data = $2 WHERE id = $3',
          [externalResult.status, JSON.stringify(externalResult), verificationId]
        );
        
        // Update user KYC status if approved
        if (externalResult.status === 'approved') {
          await client.query(
            'UPDATE users SET kyc_status = $1, updated_at = NOW() WHERE id = $2',
            ['verified', userId]
          );
        }
        
        // Log the verification result
        await this.auditService.log('kyc_verification_completed', userId, {
          documentType,
          verificationId,
          status: externalResult.status,
          ip: ipAddress
        }, client);
        
        return {
          id: verificationId,
          status: externalResult.status,
          details: externalResult.details
        };
      } catch (error) {
        // Update verification status to failed
        await client.query(
          'UPDATE kyc_documents SET status = $1, document_data = $2 WHERE id = $3',
          ['rejected', JSON.stringify({ error: error.message }), verificationId]
        );
        
        // Log the failure
        await this.auditService.log('kyc_verification_failed', userId, {
          documentType,
          verificationId,
          error: error.message,
          ip: ipAddress
        }, client);
        
        throw error;
      }
    });
  }
  
  /**
   * Check if a user has been verified
   */
  async isVerified(userId) {
    const result = await this.storage.executeQuery(
      'SELECT kyc_status FROM users WHERE id = $1',
      [userId]
    );
    
    return result.rows.length > 0 && result.rows[0].kyc_status === 'verified';
  }
  
  /**
   * Get verification status for a user
   */
  async getVerificationStatus(userId) {
    const result = await this.storage.executeQuery(
      'SELECT * FROM kyc_documents WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return { status: 'not_started' };
    }
    
    return {
      id: result.rows[0].id,
      status: result.rows[0].status,
      documentType: result.rows[0].document_type,
      createdAt: result.rows[0].created_at,
      verifiedAt: result.rows[0].verified_at
    };
  }
  
  /**
   * Get KYC tier based on verification level
   */
  async getKycTier(userId) {
    const isVerified = await this.isVerified(userId);
    if (!isVerified) return 1;
    
    // Check for additional verification documents
    const result = await this.storage.executeQuery(
      'SELECT COUNT(*) as doc_count FROM kyc_documents WHERE user_id = $1 AND status = $2',
      [userId, 'approved']
    );
    
    const docCount = parseInt(result.rows[0].doc_count);
    
    if (docCount >= 3) return 3; // Full KYC
    if (docCount >= 2) return 2; // Enhanced KYC
    return 1; // Basic KYC
  }
  
  /**
   * Get transaction limits based on KYC tier
   */
  getTransactionLimits(kycTier) {
    const limits = {
      1: { // Basic KYC
        daily: 50000,
        monthly: 500000,
        single: 25000
      },
      2: { // Enhanced KYC
        daily: 500000,
        monthly: 2000000,
        single: 250000
      },
      3: { // Full KYC
        daily: 1000000,
        monthly: 10000000,
        single: 1000000
      }
    };
    
    return limits[kycTier] || limits[1];
  }
  
  /**
   * Simulated external verification service call
   */
  async callExternalVerification(documentType, documentData) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple validation simulation
    if (!documentData || Object.keys(documentData).length === 0) {
      return {
        status: 'rejected',
        details: {
          reason: 'empty_document',
          message: 'Document data is empty or invalid'
        }
      };
    }
    
    // Simulate approval with 85% chance for testing
    const isApproved = Math.random() < 0.85;
    
    if (isApproved) {
      return {
        status: 'approved',
        details: {
          verificationScore: Math.floor(Math.random() * 30) + 70, // 70-99
          verifiedFields: ['name', 'date_of_birth', 'document_number'],
          timestamp: new Date().toISOString()
        }
      };
    } else {
      return {
        status: 'rejected',
        details: {
          reason: 'verification_failed',
          message: 'Unable to verify document authenticity',
          failedFields: ['document_number'],
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}

module.exports = { KycService };