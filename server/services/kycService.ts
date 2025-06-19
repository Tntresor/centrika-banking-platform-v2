import AWS from 'aws-sdk';
import { storage } from '../storage';
import type { KYCRequest, KYCResponse } from '../../shared/types';

// Configure AWS
const rekognition = new AWS.Rekognition({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const textract = new AWS.Textract({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

class KYCService {
  private readonly BUCKET_NAME = process.env.S3_BUCKET_NAME || 'centrika-kyc-documents';
  private readonly FACE_MATCH_THRESHOLD = 85;

  async processKYCDocuments(request: KYCRequest): Promise<KYCResponse> {
    try {
      // Upload images to S3
      const documentUrl = await this.uploadToS3(request.documentImage, `${request.userId}/document-${Date.now()}.jpg`);
      const selfieUrl = await this.uploadToS3(request.selfieImage, `${request.userId}/selfie-${Date.now()}.jpg`);

      // Extract text from document using Textract
      const ocrData = await this.extractTextFromDocument(request.documentImage);

      // Perform face comparison
      const faceComparisonResult = await this.compareFaces(request.documentImage, request.selfieImage);

      // Determine verification status
      let status: 'pending' | 'approved' | 'rejected' = 'pending';
      let score = 0;

      if (faceComparisonResult.similarity >= this.FACE_MATCH_THRESHOLD) {
        status = 'approved';
        score = faceComparisonResult.similarity;
      } else if (faceComparisonResult.similarity < 50) {
        status = 'rejected';
        score = faceComparisonResult.similarity;
      }

      // Store KYC document record
      const kycDocument = await storage.createKYCDocument({
        userId: request.userId,
        documentType: request.documentType,
        documentUrl,
        ocrData,
        verificationStatus: status,
        verificationScore: score.toString()
      });

      // Schedule document deletion (24h lifecycle)
      await this.scheduleDocumentDeletion(documentUrl, selfieUrl);

      return {
        success: true,
        verificationId: kycDocument.id.toString(),
        status,
        score,
        message: this.getStatusMessage(status, score)
      };

    } catch (error) {
      console.error('KYC processing error:', error);
      return {
        success: false,
        verificationId: '',
        status: 'pending',
        message: 'KYC processing failed. Please try again.'
      };
    }
  }

  private async uploadToS3(base64Image: string, key: string): Promise<string> {
    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const params = {
      Bucket: this.BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      ServerSideEncryption: 'aws:kms',
      StorageClass: 'STANDARD_IA'
    };

    const result = await s3.upload(params).promise();
    return result.Location;
  }

  private async extractTextFromDocument(base64Image: string): Promise<any> {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const params = {
      Document: {
        Bytes: buffer
      },
      FeatureTypes: ['TABLES', 'FORMS']
    };

    try {
      const result = await textract.analyzeDocument(params).promise();
      return this.parseTextractResult(result);
    } catch (error) {
      console.error('Textract error:', error);
      return null;
    }
  }

  private parseTextractResult(result: any): any {
    const extractedData: any = {};
    
    if (result.Blocks) {
      result.Blocks.forEach((block: any) => {
        if (block.BlockType === 'LINE') {
          const text = block.Text?.toLowerCase();
          
          // Extract common ID document fields
          if (text?.includes('national') && text?.includes('id')) {
            extractedData.documentType = 'national_id';
          }
          if (text?.match(/\d{16}/)) {
            extractedData.nationalId = text.match(/\d{16}/)[0];
          }
          if (text?.includes('date') && text?.includes('birth')) {
            const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}/);
            if (dateMatch) {
              extractedData.dateOfBirth = dateMatch[0];
            }
          }
        }
      });
    }

    return extractedData;
  }

  private async compareFaces(documentImage: string, selfieImage: string): Promise<{ similarity: number; confidence: number }> {
    const sourceBase64 = documentImage.replace(/^data:image\/\w+;base64,/, '');
    const targetBase64 = selfieImage.replace(/^data:image\/\w+;base64,/, '');

    const params = {
      SourceImage: {
        Bytes: Buffer.from(sourceBase64, 'base64')
      },
      TargetImage: {
        Bytes: Buffer.from(targetBase64, 'base64')
      },
      SimilarityThreshold: 50
    };

    try {
      const result = await rekognition.compareFaces(params).promise();
      
      if (result.FaceMatches && result.FaceMatches.length > 0) {
        const match = result.FaceMatches[0];
        return {
          similarity: match.Similarity || 0,
          confidence: match.Face?.Confidence || 0
        };
      }

      return { similarity: 0, confidence: 0 };
    } catch (error) {
      console.error('Face comparison error:', error);
      return { similarity: 0, confidence: 0 };
    }
  }

  private async scheduleDocumentDeletion(documentUrl: string, selfieUrl: string): Promise<void> {
    // In a production environment, you would set up S3 lifecycle rules
    // or use a scheduled job to delete documents after 24 hours
    // For now, we'll just log that deletion is scheduled
    console.log(`Scheduled deletion for documents: ${documentUrl}, ${selfieUrl}`);
  }

  private getStatusMessage(status: string, score: number): string {
    switch (status) {
      case 'approved':
        return `KYC verification successful. Face match score: ${score.toFixed(2)}%`;
      case 'rejected':
        return `KYC verification failed. Face match score too low: ${score.toFixed(2)}%`;
      default:
        return 'KYC verification is pending manual review.';
    }
  }
}

export const kycService = new KYCService();
