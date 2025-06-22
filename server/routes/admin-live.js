const express = require('express');
const { storage } = require('../storage-supabase');
const router = express.Router();

// Dashboard metrics endpoint - Live Supabase data
router.get('/metrics', async (req, res) => {
  try {
    await storage.connect();
    
    // Get real metrics from your Supabase database
    const [usersResult, walletsResult, transactionsResult] = await Promise.all([
      storage.client.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as daily FROM users'),
      storage.client.query('SELECT SUM(CAST(balance as DECIMAL)) as total_balance, COUNT(*) as active_wallets FROM wallets WHERE is_active = true'),
      storage.client.query('SELECT COUNT(*) as total_transactions, COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as daily_transactions FROM transactions')
    ]);
    
    const kycApprovedResult = await storage.client.query(
      "SELECT COUNT(*) FILTER (WHERE kyc_status = 'approved') * 100.0 / COUNT(*) as kyc_rate FROM users WHERE kyc_status IS NOT NULL"
    );
    
    const metrics = {
      dailySignups: parseInt(usersResult.rows[0].daily) || 0,
      successfulKYCRate: parseFloat(kycApprovedResult.rows[0].kyc_rate) || 0,
      transactionCount: parseInt(transactionsResult.rows[0].daily_transactions) || 0,
      totalLedgerBalance: parseFloat(walletsResult.rows[0].total_balance) || 0,
      activeUsers: parseInt(walletsResult.rows[0].active_wallets) || 0,
    };
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard metrics'
    });
  }
});

// Users endpoint - Live Supabase data
router.get('/users', async (req, res) => {
  try {
    await storage.connect();
    
    const { page = 1, limit = 20, status = '', search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      whereClause += ` AND kyc_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (search) {
      whereClause += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    const query = `
      SELECT u.*, w.balance, w.currency, w.kyc_level
      FROM users u 
      LEFT JOIN wallets w ON u.id = w.user_id 
      ${whereClause}
      ORDER BY u.created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const result = await storage.client.query(query, params);
    const countResult = await storage.client.query(`SELECT COUNT(*) as total FROM users u ${whereClause}`, params.slice(0, -2));
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Transactions endpoint - Live Supabase data
router.get('/transactions', async (req, res) => {
  try {
    await storage.connect();
    
    const { page = 1, limit = 20, type = '', status = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (type) {
      whereClause += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    const query = `
      SELECT t.*, 
             uf.first_name as from_user_name, uf.phone as from_user_phone,
             ut.first_name as to_user_name, ut.phone as to_user_phone
      FROM transactions t
      LEFT JOIN wallets wf ON t.from_wallet_id = wf.id
      LEFT JOIN wallets wt ON t.to_wallet_id = wt.id
      LEFT JOIN users uf ON wf.user_id = uf.id
      LEFT JOIN users ut ON wt.user_id = ut.id
      ${whereClause}
      ORDER BY t.created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const result = await storage.client.query(query, params);
    const countResult = await storage.client.query(`SELECT COUNT(*) as total FROM transactions t ${whereClause}`, params.slice(0, -2));
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});

// Agents endpoint - Live Supabase data
router.get('/agents', async (req, res) => {
  try {
    await storage.connect();
    
    const result = await storage.client.query(`
      SELECT a.*, af.available_balance, af.total_balance, af.currency
      FROM agents a 
      LEFT JOIN agent_floats af ON a.id = af.agent_id 
      ORDER BY a.created_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows.map(agent => ({
        ...agent,
        float: {
          availableBalance: agent.available_balance || '0.00',
          totalBalance: agent.total_balance || '0.00',
          currency: agent.currency || 'RWF'
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agents'
    });
  }
});

// KYC documents endpoint - Live Supabase data
router.get('/kyc', async (req, res) => {
  try {
    await storage.connect();
    
    const result = await storage.client.query(`
      SELECT k.*, u.first_name, u.last_name, u.phone, u.email
      FROM kyc_documents k
      JOIN users u ON k.user_id = u.id
      WHERE k.verification_status = 'pending'
      ORDER BY k.created_at ASC
    `);
    
    res.json({
      success: true,
      data: result.rows.map(doc => ({
        id: doc.id,
        userId: doc.user_id,
        documentType: doc.document_type,
        documentUrl: doc.document_url,
        verificationStatus: doc.verification_status,
        verificationScore: doc.verification_score || 0,
        reviewNotes: doc.review_notes || '',
        createdAt: doc.created_at,
        user: {
          firstName: doc.first_name,
          lastName: doc.last_name,
          phone: doc.phone,
          email: doc.email
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching KYC documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch KYC documents'
    });
  }
});

// Audit logs endpoint - Live Supabase data
router.get('/audit', async (req, res) => {
  try {
    await storage.connect();
    
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const result = await storage.client.query(`
      SELECT * FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    const countResult = await storage.client.query('SELECT COUNT(*) as total FROM audit_logs');
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
});

// Cash management endpoint - Live Supabase data
router.get('/cash-management', async (req, res) => {
  try {
    await storage.connect();
    
    const [nostroResult, movementsResult] = await Promise.all([
      storage.client.query('SELECT * FROM nostro_accounts ORDER BY created_at DESC'),
      storage.client.query(`
        SELECT 'agent_deposit' as type, 'Agent Cash Deposit' as description, 
               af.total_balance as amount, 'RWF' as currency, 
               'completed' as status, af.last_updated as created_at
        FROM agent_floats af 
        JOIN agents a ON af.agent_id = a.id 
        ORDER BY af.last_updated DESC 
        LIMIT 10
      `)
    ]);
    
    res.json({
      success: true,
      data: {
        nostroAccounts: nostroResult.rows,
        recentMovements: movementsResult.rows.map((movement, index) => ({
          id: index + 1,
          type: movement.type,
          amount: movement.amount,
          description: movement.description,
          reference: `REF-${Date.now()}-${index}`,
          status: movement.status,
          createdAt: movement.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching cash management data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cash management data'
    });
  }
});

module.exports = router;