import ApiService from './ApiService';
import StorageService from './StorageService';

class KYCService {
  // Mock KYC processing for Phase 0 demo
  async processKYC(kycData) {
    try {
      // In Phase 0, we'll simulate KYC processing
      // In Phase 1, this will integrate with AWS Rekognition and Textract
      
      if (process.env.NODE_ENV === 'development' || !kycData.documentImage) {
        // Mock success for demo
        return this.mockKYCSuccess();
      }

      // Phase 1: Real KYC processing
      const response = await ApiService.post('/kyc/process', {
        documentImage: kycData.documentImage,
        faceImage: kycData.faceImage,
      });

      return response;
    } catch (error) {
      console.error('KYC processing failed:', error);
      throw error;
    }
  }

  // Mock KYC success for demo purposes
  mockKYCSuccess() {
    return {
      success: true,
      extractedData: {
        firstName: 'John',
        lastName: 'Doe',
        idNumber: '1234567890123456',
        phoneNumber: '+250788123456',
        dateOfBirth: '1990-01-01',
        nationality: 'Rwandan',
      },
      faceMatch: {
        similarity: 92.5,
        confidence: 'HIGH',
      },
      documentVerification: {
        authentic: true,
        confidence: 'HIGH',
      },
    };
  }

  // Extract text from document using OCR
  async extractDocumentData(imageBase64) {
    try {
      const response = await ApiService.post('/kyc/extract-document', {
        image: imageBase64,
      });
      
      return response.extractedData;
    } catch (error) {
      console.error('Document extraction failed:', error);
      throw error;
    }
  }

  // Verify face liveness
  async verifyLiveness(imageBase64) {
    try {
      const response = await ApiService.post('/kyc/verify-liveness', {
        image: imageBase64,
      });
      
      return response.isLive;
    } catch (error) {
      console.error('Liveness verification failed:', error);
      throw error;
    }
  }

  // Compare faces
  async compareFaces(documentImage, selfieImage) {
    try {
      const response = await ApiService.post('/kyc/compare-faces', {
        sourceImage: documentImage,
        targetImage: selfieImage,
      });
      
      return response;
    } catch (error) {
      console.error('Face comparison failed:', error);
      throw error;
    }
  }

  // Get KYC status
  async getKYCStatus(userId) {
    try {
      const response = await ApiService.get(`/kyc/status/${userId}`);
      return response.status;
    } catch (error) {
      console.error('Error getting KYC status:', error);
      return 'pending';
    }
  }

  // Submit KYC for manual review
  async submitForManualReview(userId, kycData) {
    try {
      const response = await ApiService.post('/kyc/manual-review', {
        userId,
        ...kycData,
      });
      
      return response;
    } catch (error) {
      console.error('Manual review submission failed:', error);
      throw error;
    }
  }

  // Validate Rwandan ID number format
  validateIdNumber(idNumber) {
    // Rwandan ID format: 16 digits (YYYYMMDDXXXXXXXX)
    const rwandanIdRegex = /^[0-9]{16}$/;
    
    if (!rwandanIdRegex.test(idNumber)) {
      return false;
    }

    // Extract birth date from ID
    const year = parseInt(idNumber.substring(0, 4));
    const month = parseInt(idNumber.substring(4, 6));
    const day = parseInt(idNumber.substring(6, 8));

    // Basic date validation
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    return true;
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber) {
    // Rwandan phone format: +250XXXXXXXXX or 250XXXXXXXXX or 07XXXXXXXX
    const rwandanPhoneRegex = /^(\+250|250)?[0-9]{9}$/;
    return rwandanPhoneRegex.test(phoneNumber);
  }

  // Get document type from image (placeholder)
  async detectDocumentType(imageBase64) {
    // This would use ML to detect document type
    // For now, assume it's a national ID
    return 'national_id';
  }

  // Quality check for document image
  checkImageQuality(imageBase64) {
    // Basic quality checks
    const checks = {
      resolution: true, // Would check image resolution
      brightness: true, // Would check if image is too dark/bright
      blur: true, // Would check for blur
      glare: true, // Would check for glare/reflections
    };

    const passed = Object.values(checks).every(check => check);
    
    return {
      passed,
      checks,
      score: passed ? 100 : 50,
    };
  }

  // Cache KYC data locally
  async cacheKYCData(userId, kycData) {
    try {
      await StorageService.setKYCData(userId, {
        ...kycData,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error caching KYC data:', error);
    }
  }

  // Get cached KYC data
  async getCachedKYCData(userId) {
    try {
      return await StorageService.getKYCData(userId);
    } catch (error) {
      console.error('Error getting cached KYC data:', error);
      return null;
    }
  }

  // Clear KYC cache
  async clearKYCCache(userId) {
    try {
      await StorageService.removeKYCData(userId);
    } catch (error) {
      console.error('Error clearing KYC cache:', error);
    }
  }
}

export default new KYCService();
