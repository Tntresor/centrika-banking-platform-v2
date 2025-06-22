const CONFIG = {
  security: {
    bcrypt: {
      rounds: process.env.NODE_ENV === 'production' ? 12 : 10
    },
    pbkdf2: {
      iterations: parseInt(process.env.PBKDF2_ITERATIONS) || 100000
    },
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 900000, // 15 minutes
    session: {
      secret: process.env.SESSION_SECRET || require('crypto').randomBytes(64).toString('hex'),
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 3600000 // 1 hour
    },
    jwt: {
      expiresIn: process.env.NODE_ENV === 'production' ? '2h' : '24h',
      issuer: 'centrika-neobank',
      audience: 'centrika-users'
    }
  },
  wallet: {
    defaultBalance: process.env.DEFAULT_WALLET_BALANCE || '1000.00',
    currency: process.env.DEFAULT_CURRENCY || 'RWF'
  },
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10
    },
    connectionTimeout: 5000,
    queryTimeout: 10000,
    idleTimeout: 10000
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY
  },
  app: {
    port: parseInt(process.env.PORT) || 8000,
    env: process.env.NODE_ENV || 'development'
  },
  cors: {
    origins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001']
  }
};

// Validate required config
function validateConfig() {
  const required = [
    'DATABASE_URL'
  ];
  
  if (CONFIG.app.env === 'production') {
    required.push('ENCRYPTION_KEY', 'SESSION_SECRET');
  }
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = { CONFIG, validateConfig };