// Phone number validation utilities for Rwanda
export const validatePhoneNumber = (phone: string): boolean => {
  // Rwanda phone number formats:
  // +250 78/79/72/73 XXX XXXX
  // 078/079/072/073 XXX XXXX
  const rwandaPhoneRegex = /^(\+?25)?(078|079|072|073)\d{7}$/;
  return rwandaPhoneRegex.test(phone.replace(/\s/g, ''));
};

export const normalizePhoneNumber = (phone: string): string => {
  // Remove all spaces and special characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Add country code if missing
  if (cleaned.startsWith('07')) {
    return '+25' + cleaned;
  }
  
  if (cleaned.startsWith('25') && !cleaned.startsWith('+')) {
    return '+' + cleaned;
  }
  
  return cleaned;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateNationalId = (nationalId: string): boolean => {
  // Rwanda National ID is 16 digits
  const nationalIdRegex = /^\d{16}$/;
  return nationalIdRegex.test(nationalId);
};

export const validateAmount = (amount: number, min = 0, max = 1000000): boolean => {
  return amount > min && amount <= max;
};

export const validateBNRLimits = {
  singleTransaction: 1000000, // 1M RWF
  dailyLimit: 1000000, // 1M RWF
  balanceLimit: 2000000 // 2M RWF
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>\"']/g, '');
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
