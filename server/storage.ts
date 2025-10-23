import {
  users,
  rewards,
  transactions,
  redemptions,
  offers,
  socialConnections,
  receiptUploads,
  campaigns,
  loyaltyAccounts,
  earningRules,
  adminUsers,
  systemConfig,
  auditLogs,
  type User,
  type UpsertUser,
  type Reward,
  type InsertReward,
  type Transaction,
  type InsertTransaction,
  type Redemption,
  type InsertRedemption,
  type Offer,
  type InsertOffer,
  type SocialConnection,
  type InsertSocialConnection,
  type ReceiptUpload,
  type InsertReceiptUpload,
  type Campaign,
  type InsertCampaign,
  type LoyaltyAccount,
  type InsertLoyaltyAccount,
  type EarningRule,
  type InsertEarningRule,
  type AdminUser,
  type InsertAdminUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPoints(userId: string, pointsChange: number): Promise<User>;
  updateUserProfile(userId: string, updates: Partial<User>): Promise<User>;
  
  // Phone authentication methods
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  createUserWithPhone(userData: { phoneNumber: string; firstName?: string; lastName?: string; currentPlan?: string }): Promise<User>;
  
  // Email authentication methods
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserWithEmail(userData: { email: string; password: string; firstName: string; lastName: string; currentPlan?: string }): Promise<User>;
  validateUserPassword(email: string, password: string): Promise<User | null>;
  
  // Plan upgrade methods
  upgradePlan(userId: string, newPlan: string): Promise<{ user: User; pointsEarned: number }>;
  
  // Phone number management
  deregisterPhoneNumber(userId: string): Promise<User>;
  
  // Rewards operations
  getAllRewards(): Promise<Reward[]>;
  getActiveRewards(): Promise<Reward[]>;
  createReward(reward: InsertReward): Promise<Reward>;
  updateReward(id: string, updates: Partial<Reward>): Promise<Reward>;
  deactivateReward(id: string): Promise<void>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  getTransactionStats(userId: string): Promise<{
    totalPurchases: number;
    totalSpent: string;
    totalPointsEarned: number;
  }>;
  
  // Redemption operations
  createRedemption(redemption: InsertRedemption): Promise<Redemption>;
  getUserRedemptions(userId: string): Promise<(Redemption & { reward: Reward })[]>;
  markRedemptionUsed(redemptionId: string): Promise<void>;
  
  // Offers operations
  getUserOffers(userId: string): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  markOfferUsed(offerId: string): Promise<void>;
  
  // Social connections
  getUserSocialConnections(userId: string): Promise<SocialConnection[]>;
  createSocialConnection(connection: InsertSocialConnection): Promise<SocialConnection>;
  
  // Receipt uploads
  createReceiptUpload(upload: InsertReceiptUpload): Promise<ReceiptUpload>;
  getUserReceiptUploads(userId: string, limit?: number): Promise<ReceiptUpload[]>;
  updateReceiptUpload(id: string, updates: Partial<ReceiptUpload>): Promise<ReceiptUpload>;
  
  // Enterprise features - Campaigns
  getCampaigns(page?: number, limit?: number): Promise<{ campaigns: Campaign[]; total: number; hasMore: boolean; }>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined>;

  // Loyalty Accounts
  getLoyaltyAccount(userId: string): Promise<LoyaltyAccount | undefined>;
  createLoyaltyAccount(account: InsertLoyaltyAccount): Promise<LoyaltyAccount>;
  updateLoyaltyAccount(userId: string, updates: Partial<LoyaltyAccount>): Promise<LoyaltyAccount | undefined>;

  // Earning Rules
  getEarningRules(): Promise<EarningRule[]>;
  createEarningRule(rule: InsertEarningRule): Promise<EarningRule>;
  updateEarningRule(id: string, updates: Partial<EarningRule>): Promise<EarningRule | undefined>;

  // Admin Users
  getAdminUser(email: string): Promise<AdminUser | undefined>;
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUserStats(): Promise<{
    totalCustomers: number;
    activeRewards: number;
    totalPointsRedeemed: number;
    monthlyRevenue: string;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);
    
    return user;
  }

  async createUserWithPhone(userData: { phoneNumber: string; firstName?: string; lastName?: string; currentPlan?: string }): Promise<User> {
    // Map plan to tier (points will be awarded via transaction)
    const tierMapping: Record<string, { tier: string; points: number }> = {
      'Essential': { tier: 'starter', points: 100 },
      'Core': { tier: 'starter', points: 100 },
      'Plus': { tier: 'explorer', points: 200 },
      'Prime': { tier: 'explorer', points: 200 },
      'Deluxe': { tier: 'champion', points: 300 },
      'Elite': { tier: 'champion', points: 300 },
      'Bronze': { tier: 'elite', points: 500 },
      'Silver': { tier: 'elite', points: 500 },
      'Gold': { tier: 'elite', points: 500 },
      'Platinum': { tier: 'elite', points: 500 },
    };

    const planInfo = userData.currentPlan 
      ? (tierMapping[userData.currentPlan] || { tier: 'starter', points: 0 })
      : { tier: 'starter', points: 0 };

    const [newUser] = await db
      .insert(users)
      .values({
        phoneNumber: userData.phoneNumber,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        currentPlan: userData.currentPlan,
        totalPoints: 0, // Start with 0 points - welcome bonus added via transaction
        membershipTier: planInfo.tier,
        isActive: true,
        emailNotifications: false,
        pushNotifications: true,
        marketingMessages: true,
      })
      .returning();
    
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return user;
  }

  async createUserWithEmail(userData: { email: string; password: string; firstName: string; lastName: string; currentPlan?: string }): Promise<User> {
    // Default to starter tier if no plan provided
    const defaultTier = 'starter';

    const [newUser] = await db
      .insert(users)
      .values({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        currentPlan: userData.currentPlan || null,
        totalPoints: 0, // Start with 0 points - welcome bonus added via transaction
        membershipTier: defaultTier,
        isActive: true,
        emailNotifications: true,
        pushNotifications: false,
        marketingMessages: true,
      })
      .returning();
    
    return newUser;
  }

  async validateUserPassword(email: string, password: string): Promise<User | null> {
    // First, get the user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (!user || !user.password) {
      return null;
    }

    // Compare the provided password with the hashed password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    return isPasswordValid ? user : null;
  }

  async upgradePlan(userId: string, newPlan: string): Promise<{ user: User; pointsEarned: number }> {
    const tierMapping: Record<string, { tier: string; points: number }> = {
      'Essential': { tier: 'starter', points: 100 },
      'Core': { tier: 'starter', points: 100 },
      'Plus': { tier: 'explorer', points: 200 },
      'Prime': { tier: 'explorer', points: 200 },
      'Deluxe': { tier: 'champion', points: 300 },
      'Elite': { tier: 'champion', points: 300 },
      'Bronze': { tier: 'elite', points: 500 },
      'Silver': { tier: 'elite', points: 500 },
      'Gold': { tier: 'elite', points: 500 },
      'Platinum': { tier: 'elite', points: 500 },
    };

    const planInfo = tierMapping[newPlan] || { tier: 'starter', points: 100 };
    
    // Update user's plan, tier, and add points
    const [updatedUser] = await db
      .update(users)
      .set({
        currentPlan: newPlan,
        membershipTier: planInfo.tier,
        totalPoints: sql`${users.totalPoints} + ${planInfo.points}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    // Create a transaction record for the upgrade
    await this.createTransaction({
      userId,
      type: 'earning',
      description: `Plan upgrade to ${newPlan} - Tier bonus points`,
      amount: "0.00",
      pointsEarned: planInfo.points,
      pointsSpent: 0,
      status: 'completed',
      orderId: `UPGRADE-${Date.now()}`,
    });

    return { user: updatedUser, pointsEarned: planInfo.points };
  }

  async deregisterPhoneNumber(userId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        phoneNumber: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserPoints(userId: string, pointsChange: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        totalPoints: sql`${users.totalPoints} + ${pointsChange}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Rewards operations
  async getAllRewards(): Promise<Reward[]> {
    return await db.select().from(rewards).orderBy(desc(rewards.createdAt));
  }

  async getActiveRewards(): Promise<Reward[]> {
    return await db
      .select()
      .from(rewards)
      .where(
        and(
          eq(rewards.isActive, true),
          sql`${rewards.validUntil} IS NULL OR ${rewards.validUntil} > NOW()`
        )
      )
      .orderBy(rewards.pointsCost);
  }

  async createReward(reward: InsertReward): Promise<Reward> {
    const [newReward] = await db
      .insert(rewards)
      .values(reward)
      .returning();
    return newReward;
  }

  async updateReward(id: string, updates: Partial<Reward>): Promise<Reward> {
    const [reward] = await db
      .update(rewards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rewards.id, id))
      .returning();
    return reward;
  }

  async deactivateReward(id: string): Promise<void> {
    await db
      .update(rewards)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(rewards.id, id));
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();

    // Update user points if points were earned or spent
    if (transaction.pointsEarned || transaction.pointsSpent) {
      const pointsChange = (transaction.pointsEarned || 0) - (transaction.pointsSpent || 0);
      await this.updateUserPoints(transaction.userId, pointsChange);
    }

    return newTransaction;
  }

  async getUserTransactions(userId: string, limit = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async getTransactionStats(userId: string): Promise<{
    totalPurchases: number;
    totalSpent: string;
    totalPointsEarned: number;
  }> {
    const [stats] = await db
      .select({
        totalPurchases: sql<number>`COUNT(CASE WHEN type = 'purchase' THEN 1 END)`,
        totalSpent: sql<string>`COALESCE(SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END), 0)`,
        totalPointsEarned: sql<number>`COALESCE(SUM(points_earned), 0)`,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId));

    return {
      totalPurchases: stats.totalPurchases,
      totalSpent: stats.totalSpent,
      totalPointsEarned: stats.totalPointsEarned,
    };
  }

  // Redemption operations
  async createRedemption(redemption: InsertRedemption): Promise<Redemption> {
    const redemptionCode = `RDM-${randomUUID().slice(0, 8).toUpperCase()}`;
    const [newRedemption] = await db
      .insert(redemptions)
      .values({
        ...redemption,
        redemptionCode,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })
      .returning();

    // Update reward redemption count
    await db
      .update(rewards)
      .set({
        redemptionCount: sql`${rewards.redemptionCount} + 1`,
      })
      .where(eq(rewards.id, redemption.rewardId));

    return newRedemption;
  }

  async getUserRedemptions(userId: string): Promise<(Redemption & { reward: Reward })[]> {
    return await db
      .select({
        id: redemptions.id,
        userId: redemptions.userId,
        rewardId: redemptions.rewardId,
        pointsSpent: redemptions.pointsSpent,
        status: redemptions.status,
        redemptionCode: redemptions.redemptionCode,
        redeemedAt: redemptions.redeemedAt,
        usedAt: redemptions.usedAt,
        expiresAt: redemptions.expiresAt,
        reward: rewards,
      })
      .from(redemptions)
      .innerJoin(rewards, eq(redemptions.rewardId, rewards.id))
      .where(eq(redemptions.userId, userId))
      .orderBy(desc(redemptions.redeemedAt));
  }

  async markRedemptionUsed(redemptionId: string): Promise<void> {
    await db
      .update(redemptions)
      .set({ status: 'used', usedAt: new Date() })
      .where(eq(redemptions.id, redemptionId));
  }

  // Offers operations
  async getUserOffers(userId: string): Promise<Offer[]> {
    return await db
      .select()
      .from(offers)
      .where(
        and(
          eq(offers.userId, userId),
          eq(offers.isActive, true),
          eq(offers.isUsed, false),
          sql`${offers.validUntil} > NOW()`
        )
      )
      .orderBy(desc(offers.createdAt));
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    const [newOffer] = await db
      .insert(offers)
      .values(offer)
      .returning();
    return newOffer;
  }

  async markOfferUsed(offerId: string): Promise<void> {
    await db
      .update(offers)
      .set({ isUsed: true })
      .where(eq(offers.id, offerId));
  }

  // Social connections
  async getUserSocialConnections(userId: string): Promise<SocialConnection[]> {
    return await db
      .select()
      .from(socialConnections)
      .where(eq(socialConnections.userId, userId));
  }

  async createSocialConnection(connection: InsertSocialConnection): Promise<SocialConnection> {
    const [newConnection] = await db
      .insert(socialConnections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async createReceiptUpload(upload: InsertReceiptUpload): Promise<ReceiptUpload> {
    const [newUpload] = await db
      .insert(receiptUploads)
      .values(upload)
      .returning();
    return newUpload;
  }

  async getUserReceiptUploads(userId: string, limit: number = 50): Promise<ReceiptUpload[]> {
    return await db
      .select()
      .from(receiptUploads)
      .where(eq(receiptUploads.userId, userId))
      .orderBy(desc(receiptUploads.createdAt))
      .limit(limit);
  }

  async updateReceiptUpload(id: string, updates: Partial<ReceiptUpload>): Promise<ReceiptUpload> {
    const [updated] = await db
      .update(receiptUploads)
      .set({ ...updates, processedAt: new Date() })
      .where(eq(receiptUploads.id, id))
      .returning();
    return updated;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async getUserStats(): Promise<{
    totalCustomers: number;
    activeRewards: number;
    totalPointsRedeemed: number;
    monthlyRevenue: string;
  }> {
    const [userStats] = await db
      .select({
        totalCustomers: sql<number>`COUNT(*)`,
      })
      .from(users);

    const [rewardStats] = await db
      .select({
        activeRewards: sql<number>`COUNT(*)`,
      })
      .from(rewards)
      .where(eq(rewards.isActive, true));

    const [redemptionStats] = await db
      .select({
        totalPointsRedeemed: sql<number>`COALESCE(SUM(points_spent), 0)`,
      })
      .from(redemptions);

    const [revenueStats] = await db
      .select({
        monthlyRevenue: sql<string>`COALESCE(SUM(amount), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'purchase'),
          gte(transactions.createdAt, sql`date_trunc('month', now())`)
        )
      );

    return {
      totalCustomers: userStats.totalCustomers,
      activeRewards: rewardStats.activeRewards,
      totalPointsRedeemed: redemptionStats.totalPointsRedeemed,
      monthlyRevenue: revenueStats.monthlyRevenue,
    };
  }

  // Enterprise features implementation
  async getCampaigns(page = 1, limit = 20): Promise<{ campaigns: Campaign[]; total: number; hasMore: boolean; }> {
    const offset = (page - 1) * limit;
    const campaignList = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt)).limit(limit + 1).offset(offset);
    const hasMore = campaignList.length > limit;
    const resultCampaigns = hasMore ? campaignList.slice(0, -1) : campaignList;
    return { campaigns: resultCampaigns, total: resultCampaigns.length, hasMore };
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const [updatedCampaign] = await db.update(campaigns).set({ ...updates, updatedAt: new Date() }).where(eq(campaigns.id, id)).returning();
    return updatedCampaign;
  }


  async getLoyaltyAccount(userId: string): Promise<LoyaltyAccount | undefined> {
    const [account] = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.userId, userId));
    return account;
  }

  async createLoyaltyAccount(account: InsertLoyaltyAccount): Promise<LoyaltyAccount> {
    const [newAccount] = await db.insert(loyaltyAccounts).values(account).returning();
    return newAccount;
  }

  async updateLoyaltyAccount(userId: string, updates: Partial<LoyaltyAccount>): Promise<LoyaltyAccount | undefined> {
    const [updatedAccount] = await db.update(loyaltyAccounts).set({ ...updates, updatedAt: new Date() }).where(eq(loyaltyAccounts.userId, userId)).returning();
    return updatedAccount;
  }

  async getEarningRules(): Promise<EarningRule[]> {
    return await db.select().from(earningRules).orderBy(desc(earningRules.createdAt));
  }

  async createEarningRule(rule: InsertEarningRule): Promise<EarningRule> {
    const [newRule] = await db.insert(earningRules).values(rule).returning();
    return newRule;
  }

  async updateEarningRule(id: string, updates: Partial<EarningRule>): Promise<EarningRule | undefined> {
    const [updatedRule] = await db.update(earningRules).set({ ...updates, updatedAt: new Date() }).where(eq(earningRules.id, id)).returning();
    return updatedRule;
  }

  async getAdminUser(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return admin;
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [newAdmin] = await db.insert(adminUsers).values(admin).returning();
    return newAdmin;
  }
}

export const storage = new DatabaseStorage();
