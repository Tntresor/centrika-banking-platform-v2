// =============================================================================
// BACK OFFICE API ENDPOINT FOR CREDIT CONFIGURATION MANAGEMENT
// =============================================================================

// Mock configuration data for demonstration
let creditConfiguration = {
  version: "1.2.3",
  lastUpdated: new Date().toISOString(),
  environment: "development",
  userSegment: "standard",
  createdBy: "admin@centrika.rw",
  overdraft: {
    maxAmount: 1000000,
    purposeMaxLength: 200,
    rateLimit: {
      windowMs: 600000,
      maxRequests: 5
    }
  },
  credit: {
    maxAmount: 5000000,
    minTermMonths: 3,
    maxTermMonths: 12,
    purposeMaxLength: 500,
    rateLimit: {
      windowMs: 900000,
      maxRequests: 3
    }
  },
  repayment: {
    rateLimit: {
      windowMs: 300000,
      maxRequests: 10
    },
    allowedPaymentMethods: ["bank_transfer", "card", "wallet"]
  },
  facilities: {
    maxPageSize: 50,
    defaultPageSize: 10
  },
  general: {
    configCacheTtl: 300000,
    enableDetailedLogging: true,
    requirePurposeForOverdraft: false,
    skipRateLimitForAdmins: true
  }
};

function validateApiKey(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const apiKey = authHeader.substring(7);
  const expectedKey = process.env.BACK_OFFICE_API_KEY || 'centrika-secure-api-key-2025';
  
  return apiKey === expectedKey;
}

export default function handler(req, res) {
  if (!validateApiKey(req)) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or missing API key",
        timestamp: new Date().toISOString()
      }
    });
  }

  switch (req.method) {
    case 'GET':
      return handleGetConfiguration(req, res);
    case 'PUT':
      return handleUpdateConfiguration(req, res);
    default:
      return res.status(405).json({
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Method not allowed",
          timestamp: new Date().toISOString()
        }
      });
  }
}

function handleGetConfiguration(req, res) {
  try {
    const { environment, userSegment } = req.query;
    
    let config = JSON.parse(JSON.stringify(creditConfiguration));
    
    if (environment && environment !== config.environment) {
      config.environment = environment;
    }
    
    if (userSegment && userSegment !== config.userSegment) {
      config.userSegment = userSegment;
      
      if (userSegment === 'premium') {
        config.overdraft.maxAmount = 1500000;
        config.credit.maxAmount = 7500000;
      }
    }
    
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        configuration: config
      }
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error occurred",
        timestamp: new Date().toISOString()
      }
    });
  }
}

function handleUpdateConfiguration(req, res) {
  try {
    const { configuration, metadata } = req.body;
    
    if (!configuration) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Configuration data is required",
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const oldConfig = JSON.parse(JSON.stringify(creditConfiguration));
    
    const updatedConfig = {
      ...configuration,
      lastUpdated: new Date().toISOString(),
      version: configuration.version || `1.${Date.now()}`,
      environment: configuration.environment || oldConfig.environment
    };
    
    creditConfiguration = updatedConfig;
    
    const changesSummary = {
      fieldsChanged: Object.keys(configuration),
      previousVersion: oldConfig.version,
      newVersion: updatedConfig.version
    };
    
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        configuration: updatedConfig,
        changesSummary: changesSummary
      }
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error occurred",
        timestamp: new Date().toISOString()
      }
    });
  }
}