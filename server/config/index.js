const CONFIG = {
  security: {
    bcrypt: {
      rounds: process.env.NODE_ENV === 'production' ? 12 : 10
    },
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    jwt: {
      expiresIn: process.env.NODE_ENV === 'production' ? '2h' : '24h',
      issuer: 'centrika-neobank',
      audience: 'centrika-users'
    }
  },
  wallet: {
    defaultBalance: '1000.00',
    currency: 'RWF'
  },
  database: {
    connectionTimeout: 5000,
    queryTimeout: 10000,
    maxConnections: 20,
    idleTimeout: 10000
  },
  rateLimit: {
    userCreation: { max: 3, windowMs: 3600000 }, // 3 per hour
    loginAttempt: { max: 5, windowMs: 900000 },  // 5 per 15 minutes
    passwordChange: { max: 3, windowMs: 3600000 }, // 3 per hour
    transaction: { max: 50, windowMs: 3600000 }   // 50 per hour
  }
};

module.exports = { CONFIG };