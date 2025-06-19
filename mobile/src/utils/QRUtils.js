// QR Code utilities for EMVCo QR parsing and generation
class QRUtils {
  
  // Parse EMVCo QR code format
  static parseEMVCoQR(qrData) {
    try {
      // For demo purposes, handle hardcoded merchant QR
      if (qrData === 'CENTRIKA_DEMO_MERCHANT_001') {
        return {
          merchantId: 'MERCHANT_001',
          merchantName: 'Demo Merchant Store',
          amount: 5000, // 5,000 RWF
          currency: 'RWF',
          description: 'Purchase at Demo Store',
          isValid: true,
        };
      }

      // Basic EMVCo QR parsing logic
      const qrObject = {};
      let index = 0;

      while (index < qrData.length) {
        // Parse Tag-Length-Value format
        if (index + 4 > qrData.length) break;

        const tag = qrData.substring(index, index + 2);
        const length = parseInt(qrData.substring(index + 2, index + 4));
        
        if (index + 4 + length > qrData.length) break;
        
        const value = qrData.substring(index + 4, index + 4 + length);
        qrObject[tag] = value;
        
        index += 4 + length;
      }

      // Extract common fields
      const merchantData = this.extractMerchantData(qrObject);
      const amount = this.extractAmount(qrObject);
      
      return {
        merchantId: merchantData.id || 'UNKNOWN',
        merchantName: merchantData.name || 'Unknown Merchant',
        amount: amount || 0,
        currency: qrObject['53'] || 'RWF', // Transaction Currency
        description: qrObject['62'] ? this.parseAdditionalData(qrObject['62']).billNumber : '',
        countryCode: qrObject['58'] || 'RW', // Country Code
        isValid: this.validateQR(qrObject),
        raw: qrObject,
      };
    } catch (error) {
      console.error('QR parsing error:', error);
      return null;
    }
  }

  // Extract merchant data from QR
  static extractMerchantData(qrObject) {
    // Merchant Account Information (26-51)
    for (let i = 26; i <= 51; i++) {
      const tag = i.toString().padStart(2, '0');
      if (qrObject[tag]) {
        return this.parseMerchantAccount(qrObject[tag]);
      }
    }
    
    return { id: null, name: null };
  }

  // Parse merchant account information
  static parseMerchantAccount(merchantData) {
    const merchant = {};
    let index = 0;

    while (index < merchantData.length) {
      if (index + 4 > merchantData.length) break;

      const tag = merchantData.substring(index, index + 2);
      const length = parseInt(merchantData.substring(index + 2, index + 4));
      
      if (index + 4 + length > merchantData.length) break;
      
      const value = merchantData.substring(index + 4, index + 4 + length);
      
      if (tag === '00') merchant.id = value; // Merchant ID
      if (tag === '01') merchant.name = value; // Merchant Name
      
      index += 4 + length;
    }

    return merchant;
  }

  // Extract transaction amount
  static extractAmount(qrObject) {
    const amountStr = qrObject['54']; // Transaction Amount
    return amountStr ? parseFloat(amountStr) : 0;
  }

  // Parse additional data field
  static parseAdditionalData(additionalData) {
    const data = {};
    let index = 0;

    while (index < additionalData.length) {
      if (index + 4 > additionalData.length) break;

      const tag = additionalData.substring(index, index + 2);
      const length = parseInt(additionalData.substring(index + 2, index + 4));
      
      if (index + 4 + length > additionalData.length) break;
      
      const value = additionalData.substring(index + 4, index + 4 + length);
      
      if (tag === '01') data.billNumber = value;
      if (tag === '02') data.mobileNumber = value;
      if (tag === '03') data.storeLabel = value;
      if (tag === '04') data.loyaltyNumber = value;
      if (tag === '05') data.referenceLabel = value;
      if (tag === '06') data.customerLabel = value;
      if (tag === '07') data.terminalLabel = value;
      if (tag === '08') data.purposeOfTransaction = value;
      if (tag === '09') data.additionalConsumerDataRequest = value;
      
      index += 4 + length;
    }

    return data;
  }

  // Validate QR code structure
  static validateQR(qrObject) {
    // Check mandatory fields
    const payloadFormatIndicator = qrObject['00'];
    const pointOfInitiationMethod = qrObject['01'];
    const merchantCategoryCode = qrObject['52'];
    const transactionCurrency = qrObject['53'];
    const countryCode = qrObject['58'];
    const crc = qrObject['63'];

    // Basic validation
    if (payloadFormatIndicator !== '01') return false;
    if (!merchantCategoryCode) return false;
    if (!transactionCurrency) return false;
    if (!countryCode) return false;
    if (!crc) return false;

    // Check if merchant account information exists
    let hasMerchantInfo = false;
    for (let i = 26; i <= 51; i++) {
      const tag = i.toString().padStart(2, '0');
      if (qrObject[tag]) {
        hasMerchantInfo = true;
        break;
      }
    }

    return hasMerchantInfo;
  }

  // Calculate CRC16 for QR validation
  static calculateCRC16(data) {
    let crc = 0xFFFF;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
      }
    }
    
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  }

  // Generate test QR codes for demo
  static generateTestQR(merchantId, merchantName, amount = 0) {
    const qrData = {
      '00': '01', // Payload Format Indicator
      '01': '11', // Point of Initiation Method (static)
      '26': this.buildMerchantAccount(merchantId, merchantName),
      '52': '0000', // Merchant Category Code
      '53': '646', // Transaction Currency (RWF)
      '54': amount > 0 ? amount.toString() : undefined,
      '58': 'RW', // Country Code
      '59': merchantName.substring(0, 25), // Merchant Name
      '60': 'KIGALI', // Merchant City
      '62': this.buildAdditionalData('INV001', 'Test Transaction'),
    };

    // Build QR string
    let qrString = '';
    Object.keys(qrData).forEach(tag => {
      if (qrData[tag] !== undefined) {
        const value = qrData[tag];
        const length = value.length.toString().padStart(2, '0');
        qrString += `${tag}${length}${value}`;
      }
    });

    // Add CRC
    const crcPlaceholder = '6304';
    const crc = this.calculateCRC16(qrString + crcPlaceholder);
    qrString += `${crcPlaceholder}${crc}`;

    return qrString;
  }

  // Build merchant account data
  static buildMerchantAccount(merchantId, merchantName) {
    const merchantData = `00${merchantId.length.toString().padStart(2, '0')}${merchantId}`;
    return merchantData;
  }

  // Build additional data field
  static buildAdditionalData(billNumber, purpose) {
    let additionalData = '';
    
    if (billNumber) {
      additionalData += `01${billNumber.length.toString().padStart(2, '0')}${billNumber}`;
    }
    
    if (purpose) {
      additionalData += `08${purpose.length.toString().padStart(2, '0')}${purpose}`;
    }
    
    return additionalData;
  }

  // Get demo QR codes for testing
  static getDemoQRCodes() {
    return [
      {
        name: 'Demo Merchant',
        qr: 'CENTRIKA_DEMO_MERCHANT_001',
        amount: 5000,
      },
      {
        name: 'Coffee Shop',
        qr: this.generateTestQR('COFFEE_001', 'Kigali Coffee Shop', 2500),
        amount: 2500,
      },
      {
        name: 'Restaurant',
        qr: this.generateTestQR('REST_001', 'Ubumwe Restaurant', 15000),
        amount: 15000,
      },
    ];
  }

  // Validate Rwanda-specific QR requirements
  static validateRwandaQR(qrData) {
    const parsed = this.parseEMVCoQR(qrData);
    
    if (!parsed) return false;
    
    // Check currency is RWF
    if (parsed.currency !== 'RWF' && parsed.currency !== '646') return false;
    
    // Check country code is RW
    if (parsed.countryCode !== 'RW') return false;
    
    // Check amount limits (BNR requirements)
    if (parsed.amount > 1000000) return false; // Max 1M RWF per transaction
    
    return true;
  }
}

export default QRUtils;
