const crypto = require('crypto');

// Password validation function
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;
  return passwordRegex.test(password);
};

// Generate secure JWT secret if not provided
const getJWTSecret = () => {
  return process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
};

// Enhanced password requirements checker
const getPasswordRequirements = (password) => {
  const requirements = {
    minLength: password.length >= 10,
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
  getJWTSecret,
  getPasswordRequirements,
  rateLimitConfigs
};