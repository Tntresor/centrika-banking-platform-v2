const express = require('express');
const router = express.Router();

// Mock data for comprehensive back-office functionality
const mockAgents = [
  {
    id: 1,
    agentCode: 'AG001',
    businessName: 'Kigali Mobile Money',
    ownerName: 'Jean Baptiste Uwimana',
    phone: '+250788123456',
    email: 'jean@kigalimomo.rw',
    district: 'Gasabo',
    sector: 'Kimironko',
    status: 'active',
    commissionRate: '0.0025',
    cashLimit: '500000.00',
    kycStatus: 'approved',
    createdAt: new Date(),
    float: {
      availableBalance: '450000.00',
      totalBalance: '500000.00',
      currency: 'RWF'
    }
  },
  {
    id: 2,
    agentCode: 'AG002',
    businessName: 'Nyamirambo Cash Point',
    ownerName: 'Marie Claire Mukandori',
    phone: '+250788654321',
    email: 'marie@nyamirambo.rw',
    district: 'Nyarugenge',
    sector: 'Nyamirambo',
    status: 'pending',
    commissionRate: '0.0025',
    cashLimit: '300000.00',
    kycStatus: 'pending',
    createdAt: new Date(),
    float: {
      availableBalance: '0.00',
      totalBalance: '0.00',
      currency: 'RWF'
    }
  }
];

const mockNostroAccounts = [
  {
    id: 1,
    accountName: 'BNR Settlement Account',
    bankName: 'Bank of Kigali',
    accountNumber: '00123456789',
    accountType: 'settlement',
    currentBalance: '50000000.00',
    availableBalance: '48000000.00',
    minimumBalance: '1000000.00',
    currency: 'RWF',
    isActive: true,
    lastReconciled: new Date()
  },
  {
    id: 2,
    accountName: 'Operational Account',
    bankName: 'Equity Bank Rwanda',
    accountNumber: '00987654321',
    accountType: 'nostro',
    currentBalance: '25000000.00',
    availableBalance: '23500000.00',
    minimumBalance: '500000.00',
    currency: 'RWF',
    isActive: true,
    lastReconciled: new Date(Date.now() - 24 * 60 * 60 * 1000)
  }
];

const mockLedgerEntries = [
  {
    id: 1,
    transactionId: 1001,
    entryType: 'debit',
    accountType: 'user_wallet',
    accountId: 1,
    amount: '50000.00',
    currency: 'RWF',
    description: 'Cash withdrawal via agent',
    reference: 'TXN-001',
    balanceBefore: '100000.00',
    balanceAfter: '50000.00',
    createdAt: new Date(),
    transaction: {
      id: 1001,
      type: 'cash_out',
      status: 'completed',
      description: 'Agent cash withdrawal'
    }
  },
  {
    id: 2,
    transactionId: 1001,
    entryType: 'credit',
    accountType: 'agent_float',
    accountId: 1,
    amount: '50000.00',
    currency: 'RWF',
    description: 'Agent float increase from user withdrawal',
    reference: 'TXN-001',
    balanceBefore: '400000.00',
    balanceAfter: '450000.00',
    createdAt: new Date(),
    transaction: {
      id: 1001,
      type: 'cash_out',
      status: 'completed',
      description: 'Agent cash withdrawal'
    }
  }
];

const mockCashMovements = [
  {
    id: 1,
    type: 'transfer_in',
    amount: '10000000.00',
    description: 'Weekly settlement from MoMo provider',
    reference: 'SETTLE-001',
    status: 'completed',
    createdAt: new Date()
  },
  {
    id: 2,
    type: 'transfer_out',
    amount: '5000000.00',
    description: 'Agent float replenishment',
    reference: 'FLOAT-REP-001',
    status: 'completed',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
  }
];

// Agent Management Routes
router.get('/agents', (req, res) => {
  res.json({
    success: true,
    data: mockAgents
  });
});

router.post('/agents', (req, res) => {
  const newAgent = {
    id: mockAgents.length + 1,
    agentCode: `AG${String(mockAgents.length + 1).padStart(3, '0')}`,
    ...req.body,
    status: 'pending',
    kycStatus: 'pending',
    createdAt: new Date(),
    float: {
      availableBalance: '0.00',
      totalBalance: '0.00',
      currency: 'RWF'
    }
  };
  
  mockAgents.push(newAgent);
  res.json({
    success: true,
    data: newAgent
  });
});

router.put('/agents/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const agent = mockAgents.find(a => a.id === parseInt(id));
  if (agent) {
    agent.status = status;
    res.json({
      success: true,
      data: agent
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
});

router.post('/agents/:id/float', (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  
  const agent = mockAgents.find(a => a.id === parseInt(id));
  if (agent && agent.float) {
    const currentBalance = parseFloat(agent.float.totalBalance);
    const topupAmount = parseFloat(amount);
    
    agent.float.totalBalance = (currentBalance + topupAmount).toFixed(2);
    agent.float.availableBalance = (parseFloat(agent.float.availableBalance) + topupAmount).toFixed(2);
    agent.float.lastFloatTopup = new Date();
    
    res.json({
      success: true,
      data: agent
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
});

// Cash Management Routes
router.get('/nostro-accounts', (req, res) => {
  res.json({
    success: true,
    data: mockNostroAccounts
  });
});

router.get('/cash-movements', (req, res) => {
  res.json({
    success: true,
    data: mockCashMovements
  });
});

router.post('/cash-transfer', (req, res) => {
  const { fromAccountId, toAccountId, amount, description, reference } = req.body;
  
  const fromAccount = mockNostroAccounts.find(acc => acc.id === parseInt(fromAccountId));
  const toAccount = mockNostroAccounts.find(acc => acc.id === parseInt(toAccountId));
  
  if (!fromAccount || !toAccount) {
    return res.status(400).json({
      success: false,
      error: 'Invalid account selection'
    });
  }
  
  const transferAmount = parseFloat(amount);
  
  // Update balances
  fromAccount.currentBalance = (parseFloat(fromAccount.currentBalance) - transferAmount).toFixed(2);
  fromAccount.availableBalance = (parseFloat(fromAccount.availableBalance) - transferAmount).toFixed(2);
  
  toAccount.currentBalance = (parseFloat(toAccount.currentBalance) + transferAmount).toFixed(2);
  toAccount.availableBalance = (parseFloat(toAccount.availableBalance) + transferAmount).toFixed(2);
  
  // Create movement record
  const movement = {
    id: mockCashMovements.length + 1,
    type: 'internal_transfer',
    amount: amount,
    description: description,
    fromAccount: fromAccount.accountName,
    toAccount: toAccount.accountName,
    reference: reference || `XFER-${Date.now()}`,
    status: 'completed',
    createdAt: new Date()
  };
  
  mockCashMovements.push(movement);
  
  res.json({
    success: true,
    data: movement
  });
});

router.post('/nostro-accounts/:id/reconcile', (req, res) => {
  const { id } = req.params;
  
  const account = mockNostroAccounts.find(acc => acc.id === parseInt(id));
  if (account) {
    account.lastReconciled = new Date();
    res.json({
      success: true,
      data: account
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Account not found'
    });
  }
});

// Ledger Routes
router.get('/ledger/entries', (req, res) => {
  const { startDate, endDate, accountType, entryType } = req.query;
  
  let filteredEntries = [...mockLedgerEntries];
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    filteredEntries = filteredEntries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate >= start && entryDate <= end;
    });
  }
  
  if (accountType) {
    filteredEntries = filteredEntries.filter(entry => entry.accountType === accountType);
  }
  
  if (entryType) {
    filteredEntries = filteredEntries.filter(entry => entry.entryType === entryType);
  }
  
  res.json({
    success: true,
    data: filteredEntries
  });
});

router.get('/ledger/summary', (req, res) => {
  const { startDate, endDate } = req.query;
  
  let entries = [...mockLedgerEntries];
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    entries = entries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate >= start && entryDate <= end;
    });
  }
  
  const totalDebits = entries
    .filter(e => e.entryType === 'debit')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
  const totalCredits = entries
    .filter(e => e.entryType === 'credit')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);
  
  const accountBreakdown = {};
  
  entries.forEach(entry => {
    if (!accountBreakdown[entry.accountType]) {
      accountBreakdown[entry.accountType] = {
        debits: 0,
        credits: 0,
        balance: 0
      };
    }
    
    const amount = parseFloat(entry.amount);
    if (entry.entryType === 'debit') {
      accountBreakdown[entry.accountType].debits += amount;
      accountBreakdown[entry.accountType].balance -= amount;
    } else {
      accountBreakdown[entry.accountType].credits += amount;
      accountBreakdown[entry.accountType].balance += amount;
    }
  });
  
  res.json({
    success: true,
    data: {
      totalDebits,
      totalCredits,
      netPosition: totalCredits - totalDebits,
      entriesCount: entries.length,
      accountBreakdown
    }
  });
});

router.get('/ledger/export', (req, res) => {
  const { format } = req.query;
  
  if (format === 'csv') {
    const csvHeader = 'Date,Transaction ID,Entry Type,Account Type,Account ID,Amount,Currency,Description,Reference,Balance Before,Balance After\n';
    const csvData = mockLedgerEntries.map(entry => 
      `${entry.createdAt},${entry.transactionId},${entry.entryType},${entry.accountType},${entry.accountId},${entry.amount},${entry.currency},"${entry.description}",${entry.reference},${entry.balanceBefore},${entry.balanceAfter}`
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ledger_export.csv"');
    res.send(csvHeader + csvData);
  } else {
    res.json({
      success: true,
      data: mockLedgerEntries
    });
  }
});

router.post('/ledger/reconcile', (req, res) => {
  const { date } = req.body;
  
  // Mock reconciliation process
  const reconciliation = {
    id: Math.floor(Math.random() * 1000),
    date: date,
    type: 'daily',
    status: 'completed',
    systemBalance: 125450000.00,
    externalBalance: 125450000.00,
    difference: 0.00,
    notes: 'Daily reconciliation completed successfully',
    reconciledBy: 1,
    createdAt: new Date(),
    completedAt: new Date()
  };
  
  res.json({
    success: true,
    data: reconciliation
  });
});

// Commission Management Routes
router.get('/commissions', (req, res) => {
  const mockCommissions = [
    {
      id: 1,
      agentId: 1,
      transactionId: 1001,
      commissionType: 'cash_out',
      grossAmount: '50000.00',
      commissionRate: '0.0025',
      commissionAmount: '125.00',
      taxAmount: '18.75',
      netCommission: '106.25',
      status: 'pending',
      createdAt: new Date()
    }
  ];
  
  res.json({
    success: true,
    data: mockCommissions
  });
});

// Risk Management Routes
router.get('/risk-profiles', (req, res) => {
  const mockRiskProfiles = [
    {
      id: 1,
      userId: 1,
      riskScore: 25,
      riskLevel: 'low',
      lastAssessment: new Date(),
      transactionPatternScore: 20,
      velocityScore: 15,
      geographicScore: 10,
      deviceScore: 5,
      kycScore: 30,
      flags: JSON.stringify(['multiple_devices']),
      restrictions: JSON.stringify([]),
      reviewRequired: false
    }
  ];
  
  res.json({
    success: true,
    data: mockRiskProfiles
  });
});

// BNR Reporting Routes
router.get('/bnr-reports', (req, res) => {
  const mockReports = [
    {
      id: 1,
      reportType: 'monthly',
      reportPeriod: '2024-06',
      totalUsers: 15420,
      activeUsers: 8967,
      newRegistrations: 1245,
      kycCompleted: 7834,
      totalTransactions: 45672,
      totalVolume: '2456789123.00',
      cashInVolume: '1234567890.00',
      cashOutVolume: '987654321.00',
      p2pVolume: '234567012.00',
      averageTransactionSize: '53789.45',
      totalWalletBalance: '567890123.00',
      generatedBy: 1,
      createdAt: new Date()
    }
  ];
  
  res.json({
    success: true,
    data: mockReports
  });
});

router.post('/bnr-reports/generate', (req, res) => {
  const { reportType, reportPeriod } = req.body;
  
  const newReport = {
    id: Math.floor(Math.random() * 1000),
    reportType,
    reportPeriod,
    totalUsers: Math.floor(Math.random() * 20000),
    activeUsers: Math.floor(Math.random() * 10000),
    newRegistrations: Math.floor(Math.random() * 2000),
    kycCompleted: Math.floor(Math.random() * 8000),
    totalTransactions: Math.floor(Math.random() * 50000),
    totalVolume: (Math.random() * 3000000000).toFixed(2),
    cashInVolume: (Math.random() * 1500000000).toFixed(2),
    cashOutVolume: (Math.random() * 1000000000).toFixed(2),
    p2pVolume: (Math.random() * 500000000).toFixed(2),
    averageTransactionSize: (Math.random() * 100000).toFixed(2),
    totalWalletBalance: (Math.random() * 800000000).toFixed(2),
    generatedBy: 1,
    createdAt: new Date()
  };
  
  res.json({
    success: true,
    data: newReport
  });
});

module.exports = router;