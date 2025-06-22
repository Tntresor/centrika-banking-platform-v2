const crypto = require('crypto');

class EncryptionService {
  constructor(encryptionKey) {
    this.algorithm = 'aes-256-gcm';
    this.encryptionKey = encryptionKey 
      ? Buffer.from(encryptionKey, 'hex')
      : crypto.randomBytes(32); // Generate random key if not provided
  }
  
  encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      authTag
    };
  }
  
  decrypt(encryptedData, iv, authTag) {
    if (!encryptedData || !iv || !authTag) return null;
    
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm, 
        this.encryptionKey, 
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  // Hash sensitive data (one-way)
  hash(data, salt = null) {
    const saltToUse = salt || crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(data, saltToUse, 100000, 64, 'sha512').toString('hex');
    return { hash, salt: saltToUse };
  }

  // Verify hashed data
  verifyHash(data, hash, salt) {
    const hashedData = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
    return hashedData === hash;
  }
}

// Initialize encryption service with environment key
const encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const encryptionService = new EncryptionService(encryptionKey);

module.exports = { EncryptionService, encryptionService };