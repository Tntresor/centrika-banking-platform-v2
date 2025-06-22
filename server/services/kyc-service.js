const { storage } = require('../storage-supabase');
const { auditLog, auditActions } = require('./audit-service');
const { encryptionService } = require('./encryption-service');

class KycService {
  constructor() {
    this.storage = storage;
  }
  
  async verifyCustomer(userId, documentType, documentData, clientInfo = {}) {
    return await this.storage.executeTransaction(async (client) => {
      // Encrypt sensitive document data
      const encryptedData = encryptionService.encrypt(JSON.stringify(documentData));
      
      // Store verification attempt
      const verificationResult = await client.query(
        `INSERT INTO kyc_documents (user_id, document_type, document_url, verification_status, verification_score, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
        [userId, documentType, JSON.stringify(encryptedData), 'pending', 0]
      );
      
      const verificationId = verificationResult.rows[0].id;
      
      // Log KYC document upload
      await auditLog(auditActions.KYC_DOCUMENT_UPLOADED, userId, {
        documentType,
        verificationId,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent
      }, client);
      
      // Simulate external verification service call
      const verificationScore = await this.callExternalVerification(documentType, documentData);
      
      // Determine status based on score
      let status = 'rejected';
      if (verificationScore >= 85) {
        status = 'approved';
      } else if (verificationScore >= 60) {
        status = 'under_review';
      }
      
      // Update verification status
      await client.query(
        `UPDATE kyc_documents SET verification_status = $1, verification_score = $2, reviewed_at = NOW() 
         WHERE id = $3`,
        [status, verificationScore, verificationId]
      );
      
      // Update user KYC status if approved
      if (status === 'approved') {
        await client.query(
          'UPDATE users SET kyc_status = $1, updated_at = NOW() WHERE id = $2',
          ['approved', userId]
        );
        
        // Update wallet KYC level
        await client.query(
          'UPDATE wallets SET kyc_level = $1, updated_at = NOW() WHERE user_id = $2',
          [3, userId] // Higher KYC level allows higher transaction limits
        );
      }
      
      // Log KYC status change
      await auditLog(auditActions.KYC_STATUS_CHANGED, userId, {
        verificationId,
        newStatus: status,
        score: verificationScore,
        documentType,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent
      }, client);
      
      return {
        verificationId,
        status,
        score: verificationScore,
        message: this.getStatusMessage(status, verificationScore)
      };
    });
  }
  
  async isVerified(userId) {
    const result = await this.storage.executeQuery(
      'SELECT kyc_status FROM users WHERE id = $1',
      [userId]
    );
    
    return result.rows.length > 0 && result.rows[0].kyc_status === 'approved';
  }
  
  async getKYCStatus(userId) {
    const result = await this.storage.executeQuery(
      `SELECT u.kyc_status, k.verification_status, k.verification_score, k.document_type, k.created_at
       FROM users u 
       LEFT JOIN kyc_documents k ON u.id = k.user_id 
       WHERE u.id = $1 
       ORDER BY k.created_at DESC LIMIT 1`,
      [userId]
    );
    
    return result.rows[0] || { kyc_status: 'pending' };
  }
  
  async callExternalVerification(documentType, documentData) {
    // Simulate external KYC verification service
    // In production, this would call actual services like Jumio, Onfido, etc.
    
    // Basic simulation based on document completeness
    let score = 50; // Base score
    
    if (documentData.documentImage) score += 20;
    if (documentData.selfieImage) score += 15;
    if (documentData.documentNumber && documentData.documentNumber.length > 5) score += 10;
    if (documentData.fullName && documentData.fullName.length > 3) score += 5;
    
    // Add randomness to simulate real-world verification
    score += Math.floor(Math.random() * 20) - 10;
    
    // Ensure score is within valid range
    return Math.max(0, Math.min(100, score));
  }
  
  getStatusMessage(status, score) {
    switch (status) {
      case 'approved':
        return 'KYC verification completed successfully. Your account is now fully verified.';
      case 'under_review':
        return 'Your documents are under manual review. This may take 1-3 business days.';
      case 'rejected':
        return 'KYC verification failed. Please ensure your documents are clear and valid.';
      default:
        return 'KYC verification is pending.';
    }
  }
}

const kycService = new KycService();
module.exports = { KycService, kycService };