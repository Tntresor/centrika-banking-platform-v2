import crypto from 'crypto';
import { storage } from '../storage';
import type { Card } from '../../shared/schema';

class CardService {
  private readonly ENCRYPTION_KEY = process.env.CARD_ENCRYPTION_KEY || 'centrika-card-key-32-characters!';
  private readonly UNIONPAY_BIN = '624100'; // UnionPay test BIN

  async generateVirtualCard(userId: number, cardType: 'virtual' | 'physical' = 'virtual'): Promise<Card> {
    // Generate card details
    const pan = this.generatePAN();
    const cvv = this.generateCVV();
    const expiryDate = this.generateExpiryDate();
    
    // Encrypt sensitive data
    const encryptedData = this.encryptCardData({ pan, cvv });
    
    // Create masked PAN for display
    const maskedPan = this.maskPAN(pan);

    // Store card in database
    const card = await storage.createCard({
      userId,
      maskedPan,
      expiryDate,
      cardType,
      provider: 'unionpay',
      isActive: true,
      encryptedData
    });

    return card;
  }

  async getCardDetails(cardId: number): Promise<{ pan: string; cvv: string; expiryDate: string; maskedPan: string }> {
    const card = await storage.getCard(cardId);
    if (!card) {
      throw new Error('Card not found');
    }

    // Decrypt card data
    const decryptedData = this.decryptCardData(card.encryptedData);

    return {
      pan: decryptedData.pan,
      cvv: decryptedData.cvv,
      expiryDate: card.expiryDate,
      maskedPan: card.maskedPan
    };
  }

  async updateCardStatus(cardId: number, isActive: boolean): Promise<Card> {
    const card = await storage.getCard(cardId);
    if (!card) {
      throw new Error('Card not found');
    }

    // In a real implementation, you would also notify the card processor
    // For now, we'll just update the local status
    
    // Note: We need to implement an update method in storage
    // For now, we'll simulate it by creating a new transaction
    // In production, this would be a proper update operation
    const updatedCard = { ...card, isActive };
    
    return updatedCard;
  }

  private generatePAN(): string {
    // Generate a 16-digit PAN starting with UnionPay BIN
    const randomDigits = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    const partialPAN = this.UNIONPAY_BIN + randomDigits;
    
    // Calculate and append Luhn check digit
    const checkDigit = this.calculateLuhnCheckDigit(partialPAN);
    return partialPAN + checkDigit;
  }

  private generateCVV(): string {
    return Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }

  private generateExpiryDate(): string {
    const now = new Date();
    const expiryYear = now.getFullYear() + 3; // 3 years from now
    const expiryMonth = Math.floor(Math.random() * 12) + 1;
    return `${expiryMonth.toString().padStart(2, '0')}/${expiryYear}`;
  }

  private calculateLuhnCheckDigit(partialPAN: string): string {
    let sum = 0;
    let isEven = true;

    // Process digits from right to left
    for (let i = partialPAN.length - 1; i >= 0; i--) {
      let digit = parseInt(partialPAN[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit = digit % 10 + Math.floor(digit / 10);
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  private maskPAN(pan: string): string {
    // Show first 6 and last 4 digits, mask the middle
    return pan.substring(0, 6) + '******' + pan.substring(12);
  }

  private encryptCardData(data: { pan: string; cvv: string }): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.ENCRYPTION_KEY);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private decryptCardData(encryptedData: string): { pan: string; cvv: string } {
    const decipher = crypto.createDecipher('aes-256-cbc', this.ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  // Validate card for transactions
  async validateCard(cardId: number, amount: number): Promise<boolean> {
    const card = await storage.getCard(cardId);
    if (!card) {
      return false;
    }

    // Check if card is active
    if (!card.isActive) {
      return false;
    }

    // Check if card is expired
    const [month, year] = card.expiryDate.split('/');
    const expiryDate = new Date(parseInt(year), parseInt(month) - 1);
    const now = new Date();
    
    if (expiryDate < now) {
      return false;
    }

    // Additional validation logic would go here
    // (e.g., checking with card processor, fraud detection, etc.)

    return true;
  }
}

export const cardService = new CardService();
