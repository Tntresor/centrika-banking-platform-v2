const crypto = require('crypto');

// Password validation function
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Enhanced phone number sanitization
const sanitizePhone = (phone) => {
  // Remove all non-digit characters except +
  let sanitized = phone.replace(/[^\d+]/g, '');
  
  // Rwanda phone number normalization
  if (sanitized.startsWith('07') || sanitized.startsWith('08') || sanitized.startsWith('09')) {
    sanitized = '+25' + sanitized;
  } else if (sanitized.startsWith('25')) {
    sanitized = '+' + sanitized;
  } else if (!sanitized.startsWith('+')) {
    sanitized = '+' + sanitized;
  }
  
  return sanitized;
};

// Email validation
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Generate secure JWT secret if not provided
const getJWTSecret = () => {
  return process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
};

// Enhanced password requirements checker
const getPasswordRequirements = (password) => {
  const requirements = {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[@$!%*?&]/.test(password)
  };
  
  const isValid = Object.values(requirements).every(req => req);
  
  return {
    isValid,
    requirements,
    message: isValid ? 'Password meets all requirements' : 'Password does not meet security requirements'
  };
};

// Input sanitization for logging
const sanitizeForLog = (data) => {
  if (typeof data !== 'object' || data === null) return data;
  
  const sensitive = ['password', 'token', 'secret', 'key', 'hash'];
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// Rate limiting configuration for different endpoints
const rateLimitConfigs = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth requests per windowMs
  },
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  sensitive: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 sensitive operations per windowMs
  }
};

module.exports = {
  validatePassword,
  sanitizePhone,
  validateEmail,
  getJWTSecret,
  getPasswordRequirements,
  sanitizeForLog,
  rateLimitConfigs
};