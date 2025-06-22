const { storage } = require('../storage-supabase');

// Audit logging service
const auditLog = async (action, userId, details, client = null) => {
  try {
    const queryText = `
      INSERT INTO audit_logs (action, user_id, details, timestamp, ip_address, user_agent) 
      VALUES ($1, $2, $3, NOW(), $4, $5)
    `;
    const values = [
      action, 
      userId, 
      JSON.stringify(details), 
      details.ip || null,
      details.userAgent || null
    ];

    if (client) {
      // Use provided transaction client
      await client.query(queryText, values);
    } else {
      // Use storage service
      await storage.executeQuery(queryText, values);
    }
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't throw - audit failures shouldn't break the main operation
  }
};

// Audit middleware to capture all requests
const auditMiddleware = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    const userId = req.user?.id || null;
    const endTime = Date.now();
    const responseTime = endTime - req.startTime;
    
    // Don't audit health checks and static content
    if (!req.path.includes('/health') && !req.path.includes('/mobile')) {
      auditLog('api_request', userId, {
        endpoint: req.path,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        responseTime,
        timestamp: new Date().toISOString()
      }).catch(err => console.error('Audit logging failed:', err));
    }
    
    originalSend.call(this, body);
  };
  
  req.startTime = Date.now();
  next();
};

// Specific audit actions
const auditActions = {
  USER_CREATED: 'user_created',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  PASSWORD_CHANGED: 'password_changed',
  TRANSACTION_CREATED: 'transaction_created',
  WALLET_CREATED: 'wallet_created',
  KYC_DOCUMENT_UPLOADED: 'kyc_document_uploaded',
  KYC_STATUS_CHANGED: 'kyc_status_changed',
  ADMIN_ACTION: 'admin_action',
  SECURITY_VIOLATION: 'security_violation',
  DATA_ACCESS: 'data_access'
};

module.exports = { 
  auditLog, 
  auditMiddleware, 
  auditActions 
};