import axios from 'axios';

interface MoMoCollectionRequest {
  amount: number;
  phoneNumber: string;
  currency: string;
  reference: string;
  description: string;
}

interface MoMoDisbursementRequest {
  amount: number;
  phoneNumber: string;
  currency: string;
  reference: string;
  description: string;
}

interface MoMoResponse {
  success: boolean;
  transactionId?: string;
  reference?: string;
  status?: string;
  error?: string;
}

class MoMoService {
  private readonly BASE_URL = process.env.MOMO_API_URL || 'https://sandbox.momodeveloper.mtn.com';
  private readonly COLLECTION_USER_ID = process.env.MOMO_COLLECTION_USER_ID || 'test-user';
  private readonly COLLECTION_API_KEY = process.env.MOMO_COLLECTION_API_KEY || 'test-key';
  private readonly DISBURSEMENT_USER_ID = process.env.MOMO_DISBURSEMENT_USER_ID || 'test-user';
  private readonly DISBURSEMENT_API_KEY = process.env.MOMO_DISBURSEMENT_API_KEY || 'test-key';

  async initiateCollection(request: MoMoCollectionRequest): Promise<MoMoResponse> {
    try {
      // For demo purposes, simulate MoMo collection API
      // In production, this would make actual API calls to MTN MoMo
      
      const headers = {
        'Authorization': `Bearer ${this.COLLECTION_API_KEY}`,
        'X-Reference-Id': request.reference,
        'X-Target-Environment': 'sandbox',
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.COLLECTION_API_KEY
      };

      const payload = {
        amount: request.amount.toString(),
        currency: request.currency,
        externalId: request.reference,
        payer: {
          partyIdType: 'MSISDN',
          partyId: request.phoneNumber.replace(/^\+?25/, '') // Remove country code
        },
        payerMessage: request.description,
        payeeNote: request.description
      };

      console.log('Initiating MoMo collection:', payload);

      // Simulate API response
      const simulatedResponse = {
        success: true,
        transactionId: `momo_${Date.now()}`,
        reference: request.reference,
        status: 'pending'
      };

      // In a real implementation, you would make the actual API call:
      /*
      const response = await axios.post(
        `${this.BASE_URL}/collection/v1_0/requesttopay`,
        payload,
        { headers }
      );
      */

      return simulatedResponse;

    } catch (error) {
      console.error('MoMo collection error:', error);
      return {
        success: false,
        error: 'Failed to initiate MoMo collection'
      };
    }
  }

  async initiateDisbursement(request: MoMoDisbursementRequest): Promise<MoMoResponse> {
    try {
      // For demo purposes, simulate MoMo disbursement API
      const headers = {
        'Authorization': `Bearer ${this.DISBURSEMENT_API_KEY}`,
        'X-Reference-Id': request.reference,
        'X-Target-Environment': 'sandbox',
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.DISBURSEMENT_API_KEY
      };

      const payload = {
        amount: request.amount.toString(),
        currency: request.currency,
        externalId: request.reference,
        payee: {
          partyIdType: 'MSISDN',
          partyId: request.phoneNumber.replace(/^\+?25/, '') // Remove country code
        },
        payerMessage: request.description,
        payeeNote: request.description
      };

      console.log('Initiating MoMo disbursement:', payload);

      // Simulate API response
      const simulatedResponse = {
        success: true,
        transactionId: `momo_disb_${Date.now()}`,
        reference: request.reference,
        status: 'pending'
      };

      return simulatedResponse;

    } catch (error) {
      console.error('MoMo disbursement error:', error);
      return {
        success: false,
        error: 'Failed to initiate MoMo disbursement'
      };
    }
  }

  async checkTransactionStatus(reference: string): Promise<{ status: string; amount?: number; currency?: string }> {
    try {
      // For demo purposes, simulate status check
      // In production, this would query the actual MoMo API
      
      console.log('Checking MoMo transaction status for:', reference);

      // Simulate different statuses based on time
      const now = Date.now();
      const referenceTime = parseInt(reference.split('-')[1]) || now;
      const timeDiff = now - referenceTime;

      let status = 'pending';
      if (timeDiff > 30000) { // After 30 seconds, mark as successful
        status = 'completed';
      } else if (timeDiff > 120000) { // After 2 minutes, some might fail
        status = Math.random() > 0.9 ? 'failed' : 'completed';
      }

      return { status };

    } catch (error) {
      console.error('MoMo status check error:', error);
      return { status: 'failed' };
    }
  }

  async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    // Validate Rwanda phone number format
    const rwandaPhoneRegex = /^(\+?25)?(078|079|072|073)\d{7}$/;
    return rwandaPhoneRegex.test(phoneNumber);
  }

  async getAccountBalance(): Promise<{ balance: number; currency: string }> {
    try {
      // For demo purposes, return a mock balance
      // In production, this would query the actual MoMo API
      return {
        balance: 1000000, // 1M RWF
        currency: 'RWF'
      };
    } catch (error) {
      console.error('MoMo balance check error:', error);
      throw new Error('Failed to retrieve MoMo account balance');
    }
  }
}

export const momoService = new MoMoService();
