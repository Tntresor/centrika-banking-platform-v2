import { pgTable, text, integer, boolean, timestamp, decimal, varchar, jsonb } from 'drizzle-orm/pg-core';
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
