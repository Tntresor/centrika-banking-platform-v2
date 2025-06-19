// KYC Level Transaction Limits Configuration
// Based on BNR Tier II regulatory requirements

const KYC_LIMITS = {
  basic: {
    // Unverified users - minimal limits
    singleTransaction: 50000, // 50,000 RWF
    dailyLimit: 100000, // 100,000 RWF
    monthlyLimit: 500000, // 500,000 RWF
    maxBalance: 100000, // 100,000 RWF
    description: 'Basic account - phone verification only'
  },
  
  tier1: {
    // ID document verified
    singleTransaction: 500000, // 500,000 RWF
    dailyLimit: 750000, // 750,000 RWF
    monthlyLimit: 5000000, // 5,000,000 RWF
    maxBalance: 1000000, // 1,000,000 RWF
    description: 'Tier 1 KYC - ID document verified'
  },
  
  tier2: {
    // Full KYC with additional documents
    singleTransaction: 1000000, // 1,000,000 RWF (BNR limit)
    dailyLimit: 1000000, // 1,000,000 RWF (BNR limit)
    monthlyLimit: 10000000, // 10,000,000 RWF
    maxBalance: 2000000, // 2,000,000 RWF (BNR limit)
    description: 'Tier 2 KYC - Full verification'
  },
  
  premium: {
    // Enhanced due diligence for high-value customers
    singleTransaction: 1000000, // 1,000,000 RWF (BNR limit)
    dailyLimit: 1000000, // 1,000,000 RWF (BNR limit)
    monthlyLimit: 20000000, // 20,000,000 RWF
    maxBalance: 2000000, // 2,000,000 RWF (BNR limit)
    description: 'Premium KYC - Enhanced due diligence'
  }
};

// Validation function
function validateTransactionLimits(kycLevel, amount, wallet) {
  const limits = KYC_LIMITS[kycLevel];
  if (!limits) {
    throw new Error(`Invalid KYC level: ${kycLevel}`);
  }
  
  const currentBalance = parseFloat(wallet.balance);
  const transactionAmount = parseFloat(amount);
  
  // Check single transaction limit
  if (transactionAmount > limits.singleTransaction) {
    return {
      allowed: false,
      reason: `Transaction amount exceeds single transaction limit of ${limits.singleTransaction} RWF`
    };
  }
  
  // Check balance limit for deposits
  if (currentBalance + transactionAmount > limits.maxBalance) {
    return {
      allowed: false,
      reason: `Transaction would exceed maximum balance limit of ${limits.maxBalance} RWF`
    };
  }
  
  return { allowed: true };
}

// Get KYC upgrade requirements
function getKYCUpgradeRequirements(currentLevel) {
  const upgrades = {
    basic: {
      nextLevel: 'tier1',
      requirements: ['National ID or Passport', 'Selfie photo', 'Address verification']
    },
    tier1: {
      nextLevel: 'tier2',
      requirements: ['Utility bill', 'Bank statement', 'Employment verification']
    },
    tier2: {
      nextLevel: 'premium',
      requirements: ['Enhanced due diligence', 'Source of funds declaration', 'Manual review']
    }
  };
  
  return upgrades[currentLevel] || null;
}

module.exports = {
  KYC_LIMITS,
  validateTransactionLimits,
  getKYCUpgradeRequirements
};