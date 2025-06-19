const axios = require('axios');
const crypto = require('crypto');

class MoMoService {
  constructor() {
    this.baseURL = process.env.MOMO_API_URL || 'https://sandbox.momodeveloper.mtn.com';
    this.subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY || 'demo_subscription_key';
    this.apiUser = process.env.MOMO_API_USER || 'demo_api_user';
    this.apiKey = process.env.MOMO_API_KEY || 'demo_api_key';
    this.environment = process.env.MOMO_ENVIRONMENT || 'sandbox';
    
    // Collection API configuration
    this.collectionConfig = {
      baseURL: `${this.baseURL}/collection`,
      subscriptionKey: this.subscriptionKey,
    };
    
    // Disbursement API configuration
    this.disbursementConfig = {
      baseURL: `${this.baseURL}/disbursement`,
      subscriptionKey: this.subscriptionKey,
    };
  }

  // Generate access token for MoMo API
  async getAccessToken(product = 'collection') {
    try {
      const auth = Buffer.from(`${this.apiUser}:${this.apiKey}`).toString('base64');
      
      const response = await axios.post(
        `${this.baseURL}/${product}/token/`,
        {},
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return {
        success: true,
        token: response.data.access_token,
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in,
      };

    } catch (error) {
      console.error('MoMo get access token error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to get access token',
      };
    }
  }

  // Initiate MoMo collection (deposit)
  async initiateCollection({ amount, phoneNumber, externalId, payerMessage, payeeNote }) {
    try {
      // For Phase 0/1 demo, simulate MoMo collection
      if (this.environment === 'demo' || this.environment === 'sandbox') {
        return this.simulateCollection({ amount, phoneNumber, externalId, payerMessage, payeeNote });
      }

      // Get access token
      const tokenResult = await this.getAccessToken('collection');
      if (!tokenResult.success) {
        return tokenResult;
      }

      // Prepare collection request
      const collectionData = {
        amount: amount.toString(),
        currency: 'RWF',
        externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber.replace(/^\+?250/, ''), // Remove country code
        },
        payerMessage,
        payeeNote,
      };

      const referenceId = this.generateReferenceId();

      const response = await axios.post(
        `${this.collectionConfig.baseURL}/v1_0/requesttopay`,
        collectionData,
        {
          headers: {
            'Authorization': `Bearer ${tokenResult.token}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': this.environment,
            'Ocp-Apim-Subscription-Key': this.collectionConfig.subscriptionKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 202) {
        return {
          success: true,
          transactionId: referenceId,
          status: 'PENDING',
          message: 'Collection initiated successfully',
        };
      } else {
        return {
          success: false,
          message: 'Failed to initiate collection',
        };
      }

    } catch (error) {
      console.error('MoMo collection error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Collection failed',
      };
    }
  }

  // Initiate MoMo disbursement (withdrawal)
  async initiateDisbursement({ amount, phoneNumber, externalId, payerMessage, payeeNote }) {
    try {
      // For Phase 0/1 demo, simulate MoMo disbursement
      if (this.environment === 'demo' || this.environment === 'sandbox') {
        return this.simulateDisbursement({ amount, phoneNumber, externalId, payerMessage, payeeNote });
      }

      // Get access token
      const tokenResult = await this.getAccessToken('disbursement');
      if (!tokenResult.success) {
        return tokenResult;
      }

      // Prepare disbursement request
      const disbursementData = {
        amount: amount.toString(),
        currency: 'RWF',
        externalId,
        payee: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber.replace(/^\+?250/, ''), // Remove country code
        },
        payerMessage,
        payeeNote,
      };

      const referenceId = this.generateReferenceId();

      const response = await axios.post(
        `${this.disbursementConfig.baseURL}/v1_0/transfer`,
        disbursementData,
        {
          headers: {
            'Authorization': `Bearer ${tokenResult.token}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': this.environment,
            'Ocp-Apim-Subscription-Key': this.disbursementConfig.subscriptionKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 202) {
        return {
          success: true,
          transactionId: referenceId,
          status: 'PENDING',
          message: 'Disbursement initiated successfully',
        };
      } else {
        return {
          success: false,
          message: 'Failed to initiate disbursement',
        };
      }

    } catch (error) {
      console.error('MoMo disbursement error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Disbursement failed',
      };
    }
  }

  // Get transaction status from MoMo
  async getTransactionStatus(transactionId, product = 'collection') {
    try {
      // For demo, return simulated status
      if (this.environment === 'demo' || this.environment === 'sandbox') {
        return {
          success: true,
          status: 'SUCCESSFUL',
          financialTransactionId: transactionId,
        };
      }

      // Get access token
      const tokenResult = await this.getAccessToken(product);
      if (!tokenResult.success) {
        return tokenResult;
      }

      const baseURL = product === 'collection' 
        ? this.collectionConfig.baseURL 
        : this.disbursementConfig.baseURL;

      const endpoint = product === 'collection' 
        ? `/v1_0/requesttopay/${transactionId}`
        : `/v1_0/transfer/${transactionId}`;

      const response = await axios.get(
        `${baseURL}${endpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenResult.token}`,
            'X-Target-Environment': this.environment,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return {
        success: true,
        status: response.data.status,
        reason: response.data.reason,
        financialTransactionId: response.data.financialTransactionId,
        amount: response.data.amount,
        currency: response.data.currency,
      };

    } catch (error) {
      console.error('MoMo get transaction status error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to get transaction status',
      };
    }
  }

  // Simulate MoMo collection for demo/testing
  async simulateCollection({ amount, phoneNumber, externalId, payerMessage, payeeNote }) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate success/failure based on phone number pattern
    const shouldSucceed = !phoneNumber.endsWith('0000'); // Fail if phone ends with 0000

    if (shouldSucceed) {
      return {
        success: true,
        transactionId: `momo_col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'PENDING',
        message: 'Collection initiated successfully (simulated)',
      };
    } else {
      return {
        success: false,
        message: 'Insufficient funds in Mobile Money account (simulated)',
      };
    }
  }

  // Simulate MoMo disbursement for demo/testing
  async simulateDisbursement({ amount, phoneNumber, externalId, payerMessage, payeeNote }) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate success/failure based on amount
    const shouldSucceed = amount <= 500000; // Fail if amount > 500k (simulate daily limit)

    if (shouldSucceed) {
      return {
        success: true,
        transactionId: `momo_dis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'PENDING',
        message: 'Disbursement initiated successfully (simulated)',
      };
    } else {
      return {
        success: false,
        message: 'Amount exceeds daily disbursement limit (simulated)',
      };
    }
  }

  // Generate reference ID for MoMo transactions
  generateReferenceId() {
    return crypto.randomUUID();
  }

  // Verify webhook signature
  verifyWebhookSignature(payload, signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.apiKey)
        .update(JSON.stringify(payload))
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  // Get account balance from MoMo
  async getAccountBalance(product = 'collection') {
    try {
      // For demo, return mock balance
      if (this.environment === 'demo' || this.environment === 'sandbox') {
        return {
          success: true,
          balance: 1000000, // 1M RWF
          currency: 'RWF',
        };
      }

      // Get access token
      const tokenResult = await this.getAccessToken(product);
      if (!tokenResult.success) {
        return tokenResult;
      }

      const baseURL = product === 'collection' 
        ? this.collectionConfig.baseURL 
        : this.disbursementConfig.baseURL;

      const response = await axios.get(
        `${baseURL}/v1_0/account/balance`,
        {
          headers: {
            'Authorization': `Bearer ${tokenResult.token}`,
            'X-Target-Environment': this.environment,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          },
        }
      );

      return {
        success: true,
        balance: parseFloat(response.data.availableBalance),
        currency: response.data.currency,
      };

    } catch (error) {
      console.error('MoMo get account balance error:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Failed to get account balance',
      };
    }
  }

  // Validate phone number for Rwanda
  validatePhoneNumber(phoneNumber) {
    const rwandaPhoneRegex = /^(\+250|250)?[0-9]{9}$/;
    return rwandaPhoneRegex.test(phoneNumber);
  }

  // Format phone number for MoMo API
  formatPhoneNumber(phoneNumber) {
    // Remove country code and + sign
    return phoneNumber.replace(/^\+?250/, '');
  }

  // Get supported providers in Rwanda
  getSupportedProviders() {
    return [
      {
        name: 'MTN',
        code: 'MTN_MOMO',
        prefixes: ['078', '079'],
        active: true,
      },
      {
        name: 'Airtel',
        code: 'AIRTEL_MONEY',
        prefixes: ['073', '072'],
        active: true,
      },
      {
        name: 'Tigo',
        code: 'TIGO_CASH',
        prefixes: ['075'],
        active: false, // Tigo discontinued in Rwanda
      },
    ];
  }

  // Detect provider from phone number
  detectProvider(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/^\+?250/, '');
    const prefix = cleanNumber.substring(0, 3);
    
    const providers = this.getSupportedProviders();
    
    for (const provider of providers) {
      if (provider.prefixes.includes(prefix) && provider.active) {
        return provider;
      }
    }
    
    return null; // Unknown or unsupported provider
  }

  // Get transaction fees (for UI display)
  getTransactionFees(amount, type = 'collection') {
    // Rwanda MoMo fee structure (simplified)
    const feeStructure = {
      collection: [
        { min: 100, max: 2500, fee: 0 },
        { min: 2501, max: 5000, fee: 50 },
        { min: 5001, max: 10000, fee: 100 },
        { min: 10001, max: 25000, fee: 200 },
        { min: 25001, max: 50000, fee: 400 },
        { min: 50001, max: 100000, fee: 600 },
        { min: 100001, max: 500000, fee: 1000 },
        { min: 500001, max: 1000000, fee: 1500 },
      ],
      disbursement: [
        { min: 100, max: 2500, fee: 50 },
        { min: 2501, max: 5000, fee: 100 },
        { min: 5001, max: 10000, fee: 150 },
        { min: 10001, max: 25000, fee: 300 },
        { min: 25001, max: 50000, fee: 500 },
        { min: 50001, max: 100000, fee: 800 },
        { min: 100001, max: 500000, fee: 1200 },
        { min: 500001, max: 1000000, fee: 2000 },
      ],
    };

    const fees = feeStructure[type] || feeStructure.collection;
    
    for (const tier of fees) {
      if (amount >= tier.min && amount <= tier.max) {
        return {
          fee: tier.fee,
          currency: 'RWF',
          description: `${type} fee for amount ${amount} RWF`,
        };
      }
    }

    return { fee: 0, currency: 'RWF', description: 'No fee applicable' };
  }
}

module.exports = new MoMoService();
