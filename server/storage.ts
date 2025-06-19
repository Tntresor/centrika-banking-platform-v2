import { 
  users, wallets, transactions, cards, kycDocuments, adminUsers, auditLogs, notifications,
  type User, type InsertUser, type Wallet, type InsertWallet, type Transaction, type InsertTransaction,
  type Card, type InsertCard, type KYCDocument, type InsertKYCDocument, type AdminUser, type InsertAdminUser,
  type AuditLog, type InsertAuditLog, type Notification, type InsertNotification
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, like, or } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  
  // Wallet operations
  getWallet(userId: number): Promise<Wallet | undefined>;
  createWallet(insertWallet: InsertWallet): Promise<Wallet>;
  updateWalletBalance(walletId: number, amount: string): Promise<Wallet>;
  
  // Transaction operations
  createTransaction(insertTransaction: InsertTransaction): Promise<Transaction>;
  getTransactions(walletId: number, limit?: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction>;
  
  // Card operations
  createCard(insertCard: InsertCard): Promise<Card>;
  getUserCards(userId: number): Promise<Card[]>;
  getCard(id: number): Promise<Card | undefined>;
  
  // KYC operations
  createKYCDocument(insertKYC: InsertKYCDocument): Promise<KYCDocument>;
  getKYCDocuments(userId: number): Promise<KYCDocument[]>;
  updateKYCDocument(id: number, updates: Partial<KYCDocument>): Promise<KYCDocument>;
  getPendingKYCDocuments(): Promise<KYCDocument[]>;
  
  // Admin operations
  getAdminUser(email: string): Promise<AdminUser | undefined>;
  createAdminUser(insertAdmin: InsertAdminUser): Promise<AdminUser>;
  
  // Audit operations
  createAuditLog(insertAudit: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number, offset?: number): Promise<AuditLog[]>;
  
  // Notification operations
  createNotification(insertNotification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  
  // Reporting operations
  getDailyMetrics(date: string): Promise<any>;
  getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]>;
  searchUsers(query: string, status?: string): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async getWallet(userId: number): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet || undefined;
  }

  async createWallet(insertWallet: InsertWallet): Promise<Wallet> {
    const [wallet] = await db.insert(wallets).values(insertWallet).returning();
    return wallet;
  }

  async updateWalletBalance(walletId: number, amount: string): Promise<Wallet> {
    const [wallet] = await db.update(wallets).set({ balance: amount }).where(eq(wallets.id, walletId)).returning();
    return wallet;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async getTransactions(walletId: number, limit = 50): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(or(eq(transactions.fromWalletId, walletId), eq(transactions.toWalletId, walletId)))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction> {
    const [transaction] = await db.update(transactions).set(updates).where(eq(transactions.id, id)).returning();
    return transaction;
  }

  async createCard(insertCard: InsertCard): Promise<Card> {
    const [card] = await db.insert(cards).values(insertCard).returning();
    return card;
  }

  async getUserCards(userId: number): Promise<Card[]> {
    return await db.select().from(cards).where(eq(cards.userId, userId));
  }

  async getCard(id: number): Promise<Card | undefined> {
    const [card] = await db.select().from(cards).where(eq(cards.id, id));
    return card || undefined;
  }

  async createKYCDocument(insertKYC: InsertKYCDocument): Promise<KYCDocument> {
    const [kycDoc] = await db.insert(kycDocuments).values(insertKYC).returning();
    return kycDoc;
  }

  async getKYCDocuments(userId: number): Promise<KYCDocument[]> {
    return await db.select().from(kycDocuments).where(eq(kycDocuments.userId, userId));
  }

  async updateKYCDocument(id: number, updates: Partial<KYCDocument>): Promise<KYCDocument> {
    const [kycDoc] = await db.update(kycDocuments).set(updates).where(eq(kycDocuments.id, id)).returning();
    return kycDoc;
  }

  async getPendingKYCDocuments(): Promise<KYCDocument[]> {
    return await db.select().from(kycDocuments)
      .where(eq(kycDocuments.verificationStatus, 'pending'))
      .orderBy(desc(kycDocuments.createdAt));
  }

  async getAdminUser(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return admin || undefined;
  }

  async createAdminUser(insertAdmin: InsertAdminUser): Promise<AdminUser> {
    const [admin] = await db.insert(adminUsers).values(insertAdmin).returning();
    return admin;
  }

  async createAuditLog(insertAudit: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(insertAudit).returning();
    return auditLog;
  }

  async getAuditLogs(limit = 100, offset = 0): Promise<AuditLog[]> {
    return await db.select().from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async getDailyMetrics(date: string): Promise<any> {
    // This would typically involve complex aggregation queries
    // For now, returning basic structure
    return {
      dailySignups: 0,
      successfulKYCRate: 0,
      transactionCount: 0,
      totalLedgerBalance: 0,
      activeUsers: 0
    };
  }

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(and(
        gte(transactions.createdAt, new Date(startDate)),
        lte(transactions.createdAt, new Date(endDate))
      ))
      .orderBy(desc(transactions.createdAt));
  }

  async searchUsers(query: string, status?: string): Promise<User[]> {
    let whereClause = or(
      like(users.firstName, `%${query}%`),
      like(users.lastName, `%${query}%`),
      like(users.phone, `%${query}%`),
      like(users.email, `%${query}%`)
    );

    if (status) {
      whereClause = and(whereClause, eq(users.kycStatus, status));
    }

    return await db.select().from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(50);
  }
}

export const storage = new DatabaseStorage();
