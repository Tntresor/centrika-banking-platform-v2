class User {
  constructor(userData) {
    this.id = userData.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.firstName = userData.firstName;
    this.lastName = userData.lastName;
    this.phoneNumber = userData.phoneNumber;
    this.email = userData.email || null;
    this.idNumber = userData.idNumber;
    this.dateOfBirth = userData.dateOfBirth || null;
    this.nationality = userData.nationality || 'Rwandan';
    this.address = userData.address || null;
    
    // KYC related fields
    this.kycStatus = userData.kycStatus || 'pending'; // pending, approved, rejected
    this.kycSubmittedAt = userData.kycSubmittedAt || null;
    this.kycCompletedAt = userData.kycCompletedAt || null;
    this.kycApprovedBy = userData.kycApprovedBy || null;
    this.kycRejectedBy = userData.kycRejectedBy || null;
    this.kycFailureReason = userData.kycFailureReason || null;
    this.kycNotes = userData.kycNotes || null;
    this.kycData = userData.kycData || null; // Extracted data from documents
    this.manualReviewId = userData.manualReviewId || null;
    
    // Security fields
    this.pin = userData.pin || null; // Hashed PIN
    this.pinSetAt = userData.pinSetAt || null;
    this.lastLogin = userData.lastLogin || null;
    this.failedLoginAttempts = userData.failedLoginAttempts || 0;
    this.lockedUntil = userData.lockedUntil || null;
    
    // Profile fields
    this.profilePicture = userData.profilePicture || null;
    this.preferredLanguage = userData.preferredLanguage || 'en';
    this.timezone = userData.timezone || 'Africa/Kigali';
    
    // Account status
    this.status = userData.status || 'active'; // active, inactive, suspended, closed
    this.role = userData.role || 'user'; // user, admin, ops_agent
    this.tier = userData.tier || 'basic'; // basic, premium, vip
    
    // Compliance fields
    this.riskLevel = userData.riskLevel || 'low'; // low, medium, high
    this.sanctionsCheck = userData.sanctionsCheck || false;
    this.pep = userData.pep || false; // Politically Exposed Person
    this.sourceOfFunds = userData.sourceOfFunds || null;
    
    // Notification preferences
    this.notificationPreferences = userData.notificationPreferences || {
      pushNotifications: true,
      emailNotifications: false,
      smsNotifications: true,
      transactionAlerts: true,
      securityAlerts: true,
      marketingMessages: false,
    };
    
    // Device information
    this.devices = userData.devices || [];
    this.lastDeviceUsed = userData.lastDeviceUsed || null;
    
    // Limits and settings
    this.transactionLimits = userData.transactionLimits || {
      dailyLimit: 1000000, // 1M RWF
      monthlyLimit: 5000000, // 5M RWF
      singleTransactionLimit: 1000000, // 1M RWF
    };
    
    this.accountLimits = userData.accountLimits || {
      maxBalance: 2000000, // 2M RWF (BNR Tier II limit)
    };
    
    // Timestamps
    this.createdAt = userData.createdAt || new Date();
    this.updatedAt = userData.updatedAt || new Date();
    this.deletedAt = userData.deletedAt || null;
    
    // Metadata
    this.metadata = userData.metadata || {
      registrationChannel: 'mobile_app',
      referralCode: null,
      referredBy: null,
      utm: {},
    };
    
    // Verification flags
    this.phoneVerified = userData.phoneVerified || false;
    this.emailVerified = userData.emailVerified || false;
    this.identityVerified = userData.identityVerified || false;
    
    // Compliance history
    this.complianceHistory = userData.complianceHistory || [];
    
    // Account closure
    this.closureReason = userData.closureReason || null;
    this.closedBy = userData.closedBy || null;
    this.closedAt = userData.closedAt || null;
  }

  // Validate user data
  validate() {
    const errors = [];

    // Required fields validation
    if (!this.firstName || this.firstName.length < 2) {
      errors.push('First name is required and must be at least 2 characters');
    }

    if (!this.lastName || this.lastName.length < 2) {
      errors.push('Last name is required and must be at least 2 characters');
    }

    if (!this.phoneNumber || !this.validatePhoneNumber(this.phoneNumber)) {
      errors.push('Valid phone number is required');
    }

    if (!this.idNumber || !this.validateIdNumber(this.idNumber)) {
      errors.push('Valid ID number is required');
    }

    // Email validation (if provided)
    if (this.email && !this.validateEmail(this.email)) {
      errors.push('Valid email address is required');
    }

    // Date of birth validation (if provided)
    if (this.dateOfBirth && !this.validateDateOfBirth(this.dateOfBirth)) {
      errors.push('Valid date of birth is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber) {
    const rwandaPhoneRegex = /^(\+250|250)?[0-9]{9}$/;
    return rwandaPhoneRegex.test(phoneNumber);
  }

  // Validate Rwandan ID number
  validateIdNumber(idNumber) {
    // Rwandan ID format: 16 digits (YYYYMMDDXXXXXXXX)
    if (!/^\d{16}$/.test(idNumber)) {
      return false;
    }

    // Extract and validate date part
    const year = parseInt(idNumber.substring(0, 4));
    const month = parseInt(idNumber.substring(4, 6));
    const day = parseInt(idNumber.substring(6, 8));

    const currentYear = new Date().getFullYear();
    
    if (year < 1900 || year > currentYear) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    return true;
  }

  // Validate email format
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate date of birth
  validateDateOfBirth(dateOfBirth) {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();
    
    // Must be between 18 and 100 years old
    return age >= 18 && age <= 100;
  }

  // Get user's age
  getAge() {
    if (!this.dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Get full name
  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  // Check if user is active
  isActive() {
    return this.status === 'active' && !this.isLocked();
  }

  // Check if user is locked
  isLocked() {
    return this.lockedUntil && new Date() < new Date(this.lockedUntil);
  }

  // Check if KYC is approved
  isKYCApproved() {
    return this.kycStatus === 'approved';
  }

  // Get risk assessment
  getRiskLevel() {
    let riskScore = 0;

    // Age factor
    const age = this.getAge();
    if (age && age < 25) riskScore += 1;
    if (age && age > 65) riskScore += 1;

    // PEP status
    if (this.pep) riskScore += 3;

    // Source of funds
    if (!this.sourceOfFunds) riskScore += 1;

    // Account age
    const accountAge = (new Date() - new Date(this.createdAt)) / (1000 * 60 * 60 * 24);
    if (accountAge < 30) riskScore += 1;

    // Transaction patterns (would need transaction history)
    // This would be calculated based on transaction behavior

    if (riskScore <= 2) return 'low';
    if (riskScore <= 5) return 'medium';
    return 'high';
  }

  // Update last login
  updateLastLogin(deviceInfo = {}) {
    this.lastLogin = new Date();
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    this.lastDeviceUsed = deviceInfo;
    this.updatedAt = new Date();
  }

  // Increment failed login attempts
  incrementFailedLogin() {
    this.failedLoginAttempts += 1;
    
    // Lock account after 5 failed attempts for 30 minutes
    if (this.failedLoginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    }
    
    this.updatedAt = new Date();
  }

  // Reset failed login attempts
  resetFailedLogin() {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    this.updatedAt = new Date();
  }

  // Update KYC status
  updateKYCStatus(status, additionalData = {}) {
    this.kycStatus = status;
    this.kycCompletedAt = new Date();
    this.updatedAt = new Date();

    // Add to compliance history
    this.complianceHistory.push({
      action: `KYC_${status.toUpperCase()}`,
      timestamp: new Date(),
      ...additionalData,
    });

    if (status === 'approved') {
      this.identityVerified = true;
    }
  }

  // Add device registration
  addDevice(deviceInfo) {
    const device = {
      id: `device_${Date.now()}`,
      ...deviceInfo,
      registeredAt: new Date(),
      lastUsed: new Date(),
    };

    this.devices.push(device);
    this.lastDeviceUsed = device;
    this.updatedAt = new Date();

    return device;
  }

  // Remove device
  removeDevice(deviceId) {
    this.devices = this.devices.filter(device => device.id !== deviceId);
    this.updatedAt = new Date();
  }

  // Update notification preferences
  updateNotificationPreferences(preferences) {
    this.notificationPreferences = {
      ...this.notificationPreferences,
      ...preferences,
    };
    this.updatedAt = new Date();
  }

  // Suspend user account
  suspend(reason, suspendedBy) {
    this.status = 'suspended';
    this.complianceHistory.push({
      action: 'ACCOUNT_SUSPENDED',
      reason,
      suspendedBy,
      timestamp: new Date(),
    });
    this.updatedAt = new Date();
  }

  // Reactivate user account
  reactivate(reactivatedBy) {
    this.status = 'active';
    this.complianceHistory.push({
      action: 'ACCOUNT_REACTIVATED',
      reactivatedBy,
      timestamp: new Date(),
    });
    this.updatedAt = new Date();
  }

  // Close user account
  close(reason, closedBy) {
    this.status = 'closed';
    this.closureReason = reason;
    this.closedBy = closedBy;
    this.closedAt = new Date();
    this.updatedAt = new Date();

    this.complianceHistory.push({
      action: 'ACCOUNT_CLOSED',
      reason,
      closedBy,
      timestamp: new Date(),
    });
  }

  // Get sanitized user data (remove sensitive fields)
  toSafeObject() {
    const safeUser = { ...this };
    
    // Remove sensitive fields
    delete safeUser.pin;
    delete safeUser.devices;
    delete safeUser.complianceHistory;
    delete safeUser.kycData;
    
    return safeUser;
  }

  // Get minimal user data for API responses
  toMinimalObject() {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      phoneNumber: this.phoneNumber,
      kycStatus: this.kycStatus,
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}

module.exports = User;
