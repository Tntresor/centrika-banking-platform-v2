import { pgTable, text, integer, boolean, timestamp, decimal, varchar, jsonb, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  dateOfBirth: timestamp('date_of_birth'),
  nationalId: varchar('national_id', { length: 20 }),
  address: text('address'),
  kycStatus: varchar('kyc_status', { length: 20 }).default('pending'), // pending, approved, rejected
  kycDocuments: jsonb('kyc_documents'),
  isActive: boolean('is_active').default(true),
  preferredLanguage: varchar('preferred_language', { length: 5 }).default('en'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const wallets = pgTable('wallets', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').references(() => users.id).notNull(),
  balance: decimal('balance', { precision: 15, scale: 2 }).default('0.00'),
  currency: varchar('currency', { length: 3 }).default('RWF'),
  kycLevel: varchar('kyc_level', { length: 20 }).default('basic'), // basic, tier1, tier2, premium
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  fromWalletId: integer('from_wallet_id').references(() => wallets.id),
  toWalletId: integer('to_wallet_id').references(() => wallets.id),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('RWF'),
  type: varchar('type', { length: 20 }).notNull(), // deposit, withdrawal, transfer, payment
  status: varchar('status', { length: 20 }).default('pending'), // pending, completed, failed
  reference: varchar('reference', { length: 100 }).unique(),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const cards = pgTable('cards', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').references(() => users.id).notNull(),
  maskedPan: varchar('masked_pan', { length: 20 }).notNull(),
  expiryDate: varchar('expiry_date', { length: 7 }).notNull(), // MM/YYYY
  cardType: varchar('card_type', { length: 20 }).default('virtual'), // virtual, physical
  provider: varchar('provider', { length: 20 }).default('unionpay'),
  isActive: boolean('is_active').default(true),
  encryptedData: text('encrypted_data'), // encrypted PAN and CVV
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const kycDocuments = pgTable('kyc_documents', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').references(() => users.id).notNull(),
  documentType: varchar('document_type', { length: 20 }).notNull(), // national_id, passport, selfie
  documentUrl: text('document_url'),
  ocrData: jsonb('ocr_data'),
  verificationStatus: varchar('verification_status', { length: 20 }).default('pending'),
  verificationScore: decimal('verification_score', { precision: 5, scale: 2 }),
  reviewedBy: integer('reviewed_by').references(() => adminUsers.id),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const adminUsers = pgTable('admin_users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).default('ops_agent'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').references(() => users.id),
  adminUserId: integer('admin_user_id').references(() => adminUsers.id),
  action: varchar('action', { length: 50 }).notNull(),
  entity: varchar('entity', { length: 50 }).notNull(),
  entityId: integer('entity_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // transaction, kyc, system
  isRead: boolean('is_read').default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Agent Network Management
export const agents = pgTable('agents', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  agentCode: varchar('agent_code', { length: 20 }).unique().notNull(),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  ownerName: varchar('owner_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).unique().notNull(),
  email: varchar('email', { length: 255 }),
  nationalId: varchar('national_id', { length: 20 }).unique(),
  district: varchar('district', { length: 100 }).notNull(),
  sector: varchar('sector', { length: 100 }).notNull(),
  cell: varchar('cell', { length: 100 }),
  village: varchar('village', { length: 100 }),
  address: text('address'),
  gpsCoordinates: varchar('gps_coordinates', { length: 100 }),
  status: varchar('status', { length: 20 }).default('pending'), // pending, active, suspended, terminated
  commissionRate: decimal('commission_rate', { precision: 5, scale: 4 }).default('0.0025'), // 0.25%
  cashLimit: decimal('cash_limit', { precision: 15, scale: 2 }).default('500000.00'), // 500K RWF
  dailyTransactionLimit: decimal('daily_transaction_limit', { precision: 15, scale: 2 }).default('2000000.00'),
  monthlyTransactionLimit: decimal('monthly_transaction_limit', { precision: 15, scale: 2 }).default('50000000.00'),
  kycStatus: varchar('kyc_status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Agent Cash Management (Float)
export const agentFloats = pgTable('agent_floats', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  agentId: integer('agent_id').references(() => agents.id).notNull(),
  currency: varchar('currency', { length: 3 }).default('RWF'),
  availableBalance: decimal('available_balance', { precision: 15, scale: 2 }).default('0.00'),
  totalBalance: decimal('total_balance', { precision: 15, scale: 2 }).default('0.00'),
  reservedBalance: decimal('reserved_balance', { precision: 15, scale: 2 }).default('0.00'),
  lastFloatTopup: timestamp('last_float_topup'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Micro-Ledger Entries
export const ledgerEntries = pgTable('ledger_entries', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  transactionId: integer('transaction_id').references(() => transactions.id),
  entryType: varchar('entry_type', { length: 20 }).notNull(), // debit, credit
  accountType: varchar('account_type', { length: 50 }).notNull(), // user_wallet, agent_float, bank_nostro, commission, fee, tax
  accountId: integer('account_id'), // wallet_id, agent_id, etc.
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('RWF'),
  description: varchar('description', { length: 255 }),
  reference: varchar('reference', { length: 100 }),
  balanceBefore: decimal('balance_before', { precision: 15, scale: 2 }),
  balanceAfter: decimal('balance_after', { precision: 15, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Financial Reconciliation
export const reconciliations = pgTable('reconciliations', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  date: date('date').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // daily, monthly, momo_provider, bank
  status: varchar('status', { length: 20 }).default('pending'), // pending, completed, discrepancy
  systemBalance: decimal('system_balance', { precision: 15, scale: 2 }).notNull(),
  externalBalance: decimal('external_balance', { precision: 15, scale: 2 }),
  difference: decimal('difference', { precision: 15, scale: 2 }).default('0.00'),
  reconciliationFile: varchar('reconciliation_file', { length: 255 }),
  notes: text('notes'),
  reconciledBy: integer('reconciled_by').references(() => adminUsers.id),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Commission Tracking
export const commissions = pgTable('commissions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  agentId: integer('agent_id').references(() => agents.id).notNull(),
  transactionId: integer('transaction_id').references(() => transactions.id).notNull(),
  commissionType: varchar('commission_type', { length: 50 }).notNull(), // cash_in, cash_out, transfer
  grossAmount: decimal('gross_amount', { precision: 15, scale: 2 }).notNull(),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 4 }).notNull(),
  commissionAmount: decimal('commission_amount', { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }).default('0.00'),
  netCommission: decimal('net_commission', { precision: 15, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending, paid, reversed
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Cash Management (Nostro/Vostro accounts)
export const nostroAccounts = pgTable('nostro_accounts', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  bankName: varchar('bank_name', { length: 255 }).notNull(),
  accountNumber: varchar('account_number', { length: 50 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('RWF'),
  accountType: varchar('account_type', { length: 50 }).notNull(), // nostro, settlement, reserve
  currentBalance: decimal('current_balance', { precision: 15, scale: 2 }).default('0.00'),
  availableBalance: decimal('available_balance', { precision: 15, scale: 2 }).default('0.00'),
  minimumBalance: decimal('minimum_balance', { precision: 15, scale: 2 }).default('0.00'),
  maximumBalance: decimal('maximum_balance', { precision: 15, scale: 2 }),
  isActive: boolean('is_active').default(true),
  lastReconciled: timestamp('last_reconciled'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// BNR Reporting
export const bnrReports = pgTable('bnr_reports', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  reportType: varchar('report_type', { length: 50 }).notNull(), // daily, weekly, monthly, quarterly
  reportPeriod: varchar('report_period', { length: 20 }).notNull(), // YYYY-MM-DD or YYYY-MM
  totalUsers: integer('total_users').default(0),
  activeUsers: integer('active_users').default(0),
  newRegistrations: integer('new_registrations').default(0),
  kycCompleted: integer('kyc_completed').default(0),
  totalTransactions: integer('total_transactions').default(0),
  totalVolume: decimal('total_volume', { precision: 15, scale: 2 }).default('0.00'),
  cashInVolume: decimal('cash_in_volume', { precision: 15, scale: 2 }).default('0.00'),
  cashOutVolume: decimal('cash_out_volume', { precision: 15, scale: 2 }).default('0.00'),
  p2pVolume: decimal('p2p_volume', { precision: 15, scale: 2 }).default('0.00'),
  averageTransactionSize: decimal('average_transaction_size', { precision: 15, scale: 2 }).default('0.00'),
  totalWalletBalance: decimal('total_wallet_balance', { precision: 15, scale: 2 }).default('0.00'),
  reportFile: varchar('report_file', { length: 255 }),
  submittedAt: timestamp('submitted_at'),
  generatedBy: integer('generated_by').references(() => adminUsers.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Risk Management
export const riskProfiles = pgTable('risk_profiles', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').references(() => users.id).notNull(),
  riskScore: integer('risk_score').default(0), // 0-100
  riskLevel: varchar('risk_level', { length: 20 }).default('low'), // low, medium, high, critical
  lastAssessment: timestamp('last_assessment').defaultNow(),
  transactionPatternScore: integer('transaction_pattern_score').default(0),
  velocityScore: integer('velocity_score').default(0),
  geographicScore: integer('geographic_score').default(0),
  deviceScore: integer('device_score').default(0),
  kycScore: integer('kyc_score').default(0),
  flags: text('flags'), // JSON array of risk flags
  restrictions: text('restrictions'), // JSON array of restrictions
  reviewRequired: boolean('review_required').default(false),
  lastReviewedBy: integer('last_reviewed_by').references(() => adminUsers.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Compliance Cases
export const complianceCases = pgTable('compliance_cases', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  caseNumber: varchar('case_number', { length: 50 }).unique().notNull(),
  userId: integer('user_id').references(() => users.id),
  agentId: integer('agent_id').references(() => agents.id),
  caseType: varchar('case_type', { length: 50 }).notNull(), // aml, fraud, kyc_issue, suspicious_activity
  priority: varchar('priority', { length: 20 }).default('medium'), // low, medium, high, critical
  status: varchar('status', { length: 20 }).default('open'), // open, investigating, resolved, closed
  description: text('description').notNull(),
  findings: text('findings'),
  actions: text('actions'),
  assignedTo: integer('assigned_to').references(() => adminUsers.id),
  createdBy: integer('created_by').references(() => adminUsers.id).notNull(),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(wallets, { fields: [users.id], references: [wallets.userId] }),
  cards: many(cards),
  kycDocuments: many(kycDocuments),
  notifications: many(notifications),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  outgoingTransactions: many(transactions, { relationName: 'fromWallet' }),
  incomingTransactions: many(transactions, { relationName: 'toWallet' }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  fromWallet: one(wallets, { fields: [transactions.fromWalletId], references: [wallets.id], relationName: 'fromWallet' }),
  toWallet: one(wallets, { fields: [transactions.toWalletId], references: [wallets.id], relationName: 'toWallet' }),
}));

export const cardsRelations = relations(cards, ({ one }) => ({
  user: one(users, { fields: [cards.userId], references: [users.id] }),
}));

export const kycDocumentsRelations = relations(kycDocuments, ({ one }) => ({
  user: one(users, { fields: [kycDocuments.userId], references: [users.id] }),
  reviewer: one(adminUsers, { fields: [kycDocuments.reviewedBy], references: [adminUsers.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  float: one(agentFloats, { fields: [agents.id], references: [agentFloats.agentId] }),
  commissions: many(commissions),
  complianceCases: many(complianceCases),
}));

export const agentFloatsRelations = relations(agentFloats, ({ one }) => ({
  agent: one(agents, { fields: [agentFloats.agentId], references: [agents.id] }),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  transaction: one(transactions, { fields: [ledgerEntries.transactionId], references: [transactions.id] }),
}));

export const commissionsRelations = relations(commissions, ({ one }) => ({
  agent: one(agents, { fields: [commissions.agentId], references: [agents.id] }),
  transaction: one(transactions, { fields: [commissions.transactionId], references: [transactions.id] }),
}));

export const reconciliationsRelations = relations(reconciliations, ({ one }) => ({
  reconciledBy: one(adminUsers, { fields: [reconciliations.reconciledBy], references: [adminUsers.id] }),
}));

export const bnrReportsRelations = relations(bnrReports, ({ one }) => ({
  generatedBy: one(adminUsers, { fields: [bnrReports.generatedBy], references: [adminUsers.id] }),
}));

export const riskProfilesRelations = relations(riskProfiles, ({ one }) => ({
  user: one(users, { fields: [riskProfiles.userId], references: [users.id] }),
  lastReviewedBy: one(adminUsers, { fields: [riskProfiles.lastReviewedBy], references: [adminUsers.id] }),
}));

export const complianceCasesRelations = relations(complianceCases, ({ one }) => ({
  user: one(users, { fields: [complianceCases.userId], references: [users.id] }),
  agent: one(agents, { fields: [complianceCases.agentId], references: [agents.id] }),
  assignedTo: one(adminUsers, { fields: [complianceCases.assignedTo], references: [adminUsers.id] }),
  createdBy: one(adminUsers, { fields: [complianceCases.createdBy], references: [adminUsers.id] }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type InsertCard = typeof cards.$inferInsert;
export type KYCDocument = typeof kycDocuments.$inferSelect;
export type InsertKYCDocument = typeof kycDocuments.$inferInsert;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;
export type AgentFloat = typeof agentFloats.$inferSelect;
export type InsertAgentFloat = typeof agentFloats.$inferInsert;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntries.$inferInsert;
export type Reconciliation = typeof reconciliations.$inferSelect;
export type InsertReconciliation = typeof reconciliations.$inferInsert;
export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = typeof commissions.$inferInsert;
export type NostroAccount = typeof nostroAccounts.$inferSelect;
export type InsertNostroAccount = typeof nostroAccounts.$inferInsert;
export type BNRReport = typeof bnrReports.$inferSelect;
export type InsertBNRReport = typeof bnrReports.$inferInsert;
export type RiskProfile = typeof riskProfiles.$inferSelect;
export type InsertRiskProfile = typeof riskProfiles.$inferInsert;
export type ComplianceCase = typeof complianceCases.$inferSelect;
export type InsertComplianceCase = typeof complianceCases.$inferInsert;
