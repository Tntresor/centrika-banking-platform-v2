import type { QRPaymentData } from '../../shared/types';

interface MoMoDepositRequest {
  amount: number;
  phoneNumber: string;
  provider: 'mtn' | 'airtel';
  reference: string;
}

interface PaymentResult {
  success: boolean;
  error?: string;
  transactionId?: string;
}

class PaymentService {
  async processMoMoDeposit(request: MoMoDepositRequest): Promise<PaymentResult> {
    try {
      // In production, integrate with actual MoMo API
      // For development, simulate the payment process
      
      console.log(`Processing MoMo deposit: ${JSON.stringify(request)}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success/failure (90% success rate)
      const isSuccess = Math.random() > 0.1;
      
      if (isSuccess) {
        return {
          success: true,
          transactionId: `MOMO_${Date.now()}_${request.provider.toUpperCase()}`
        };
      } else {
        return {
          success: false,
          error: 'Insufficient funds or network error'
        };
      }
    } catch (error) {
      console.error('MoMo deposit error:', error);
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }

  async processMoMoCashout(request: {
    amount: number;
    phoneNumber: string;
    provider: 'mtn' | 'airtel';
    reference: string;
  }): Promise<PaymentResult> {
    try {
      // Simulate cashout process
      console.log(`Processing MoMo cashout: ${JSON.stringify(request)}`);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const isSuccess = Math.random() > 0.15; // 85% success rate
      
      if (isSuccess) {
        return {
          success: true,
          transactionId: `CASHOUT_${Date.now()}_${request.provider.toUpperCase()}`
        };
      } else {
        return {
          success: false,
          error: 'Cashout failed - please try again'
        };
      }
    } catch (error) {
      console.error('MoMo cashout error:', error);
      return {
        success: false,
        error: 'Cashout processing failed'
      };
    }
  }

  parseQRData(qrData: string): QRPaymentData {
    try {
      // Handle different QR code formats
      
      if (qrData.startsWith('centrika://')) {
        // Custom Centrika QR format
        const url = new URL(qrData);
        return {
          merchantId: url.searchParams.get('merchant') || '',
          merchantName: url.searchParams.get('name') || 'Unknown Merchant',
          amount: url.searchParams.get('amount') ? parseFloat(url.searchParams.get('amount')!) : undefined,
          currency: url.searchParams.get('currency') || 'RWF',
          reference: url.searchParams.get('ref') || `QR_${Date.now()}`
        };
      }
      
      if (qrData.includes('merchant')) {
        // JSON format QR
        const data = JSON.parse(qrData);
        return {
          merchantId: data.merchantId || data.id || '',
          merchantName: data.merchantName || data.name || 'Unknown Merchant',
          amount: data.amount,
          currency: data.currency || 'RWF',
          reference: data.reference || `QR_${Date.now()}`
        };
      }
      
      // Default/hardcoded merchant for demo
      return {
        merchantId: 'DEMO_MERCHANT_001',
        merchantName: 'Demo Coffee Shop',
        amount: undefined, // User will input amount
        currency: 'RWF',
        reference: `QR_${Date.now()}`
      };
    } catch (error) {
      console.error('QR parsing error:', error);
      // Return default merchant data for demo
      return {
        merchantId: 'DEMO_MERCHANT_001',
        merchantName: 'Demo Coffee Shop',
        amount: undefined,
        currency: 'RWF',
        reference: `QR_${Date.now()}`
      };
    }
  }

  generateQRData(merchantId: string, merchantName: string, amount?: number): string {
    const qrData = {
      merchantId,
      merchantName,
      amount,
      currency: 'RWF',
      reference: `QR_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(qrData);
  }

  validateTransactionLimits(amount: number, userKycStatus: string): { valid: boolean; error?: string } {
    // BNR Tier II limits
    const maxSingleTransaction = 1000000; // 1M RWF
    const maxDailyLimit = 1000000; // 1M RWF
    
    if (amount > maxSingleTransaction) {
      return {
        valid: false,
        error: `Transaction amount exceeds limit of ${maxSingleTransaction.toLocaleString()} RWF`
      };
    }
    
    if (userKycStatus !== 'approved' && amount > 100000) {
      return {
        valid: false,
        error: 'KYC approval required for transactions above 100,000 RWF'
      };
    }
    
    return { valid: true };
  }
}

export const paymentService = new PaymentService();
