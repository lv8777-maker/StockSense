import {
  users,
  rewards,
  transactions,
  rewardNotifications,
  redemptions,
  offers,
  receiptUploads,
  invoiceSubmissions,
  campaigns,
  loyaltyAccounts,
  earningRules,
  adminUsers,
  systemConfig,
  auditLogs,
  passwordResetTokens,
  emailVerifications,
  type EmailVerification,
  type User,
  type UpsertUser,
  type Reward,
  type InsertReward,
  type Transaction,
  type InsertTransaction,
  type RewardNotification,
  type InsertRewardNotification,
  type PendingRewardNotification,
  type Redemption,
  type InsertRedemption,
  type Offer,
  type InsertOffer,
  type ReceiptUpload,
  type InsertReceiptUpload,
  type InvoiceSubmission,
  type InsertInvoiceSubmission,
  type Campaign,
  type InsertCampaign,
  type LoyaltyAccount,
  type InsertLoyaltyAccount,
  type EarningRule,
  type InsertEarningRule,
  type AdminUser,
  type InsertAdminUser,
  type PasswordResetToken,
  type AuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { findNewlyQualifiedRewards, type NewlyQualifiedReward } from "./rewardQualification";

export class RedemptionOperationError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "RedemptionOperationError";
  }
}

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
  createUserWithEmail(userData: { email: string; password: string; firstName: string; lastName: string; phoneNumber: string; currentPlan?: string; termsVersion?: string }): Promise<User>;
  validateUserPassword(email: string, password: string): Promise<User | null>;

  // Email + phone verification
  createEmailVerification(data: { userId: string; email: string; phoneNumber: string; codeHash: string; expiresAt: Date }): Promise<EmailVerification>;
  getActiveEmailVerification(userId: string): Promise<EmailVerification | undefined>;
  incrementVerificationAttempts(id: string): Promise<void>;
  markVerificationConsumed(id: string): Promise<void>;
  markUserVerified(userId: string): Promise<User>;
  invalidateUserVerifications(userId: string): Promise<void>;
  
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
  awardReceiptPoints(
    transaction: InsertTransaction,
    receiptUploadId: string,
    receiptUpdates: Partial<ReceiptUpload>,
  ): Promise<{
    transaction: Transaction;
    receipt: ReceiptUpload;
    newlyQualifiedRewards: NewlyQualifiedReward[];
  }>;
  getUserTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  getTransactionStats(userId: string): Promise<{
    totalPurchases: number;
    totalSpent: string;
    totalPointsEarned: number;
  }>;

  // Reward qualification notifications
  createRewardNotification(notification: InsertRewardNotification): Promise<RewardNotification>;
  getPendingRewardNotifications(userId: string): Promise<PendingRewardNotification[]>;
  getRewardNotification(id: string, userId: string): Promise<RewardNotification | undefined>;
  resolveRewardNotification(
    id: string,
    userId: string,
    status: 'redeemed' | 'dismissed',
  ): Promise<boolean>;
  
  // Redemption operations
  createRedemption(redemption: InsertRedemption): Promise<Redemption>;
  redeemReward(
    userId: string,
    rewardId: string,
    notificationId?: string,
  ): Promise<{ redemption: Redemption; idempotent: boolean }>;
  getUserRedemptions(userId: string): Promise<(Redemption & { reward: Reward })[]>;
  markRedemptionUsed(redemptionId: string): Promise<void>;
  
  // Offers operations
  getUserOffers(userId: string): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  markOfferUsed(offerId: string): Promise<void>;
  
  
  // Receipt uploads
  getReceiptUploadByHash(userId: string, fileHash: string): Promise<ReceiptUpload | undefined>;
  createReceiptUpload(upload: InsertReceiptUpload): Promise<ReceiptUpload>;
  deleteReceiptUpload(id: string): Promise<void>;
  getUserReceiptUploads(userId: string, limit?: number): Promise<ReceiptUpload[]>;
  updateReceiptUpload(id: string, updates: Partial<ReceiptUpload>): Promise<ReceiptUpload>;

  // Invoice submissions
  getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceSubmission | undefined>;
  createInvoiceSubmission(submission: InsertInvoiceSubmission): Promise<InvoiceSubmission>;
  awardInvoicePoints(
    submission: InsertInvoiceSubmission,
    transaction: Omit<InsertTransaction, "userId">,
  ): Promise<{ submission: InvoiceSubmission; transaction: Transaction; user: User }>;
  getUserInvoiceSubmissions(userId: string, limit?: number): Promise<InvoiceSubmission[]>;
  
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
  getAdminByUserId(userId: string): Promise<AdminUser | null>;
  getAdminById(adminId: string): Promise<AdminUser | null>;
  listAdminUsers(): Promise<AdminUser[]>;
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(adminId: string, updates: Partial<AdminUser>): Promise<AdminUser>;
  deactivateAdmin(adminId: string): Promise<void>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUserStats(): Promise<{
    totalCustomers: number;
    activeRewards: number;
    totalPointsRedeemed: number;
    monthlyRevenue: string;
  }>;
  deactivateUser(userId: string): Promise<void>;
  softDeactivateReward(rewardId: string): Promise<void>;

  // Audit logs
  createAuditLog(entry: {
    entityType: string;
    entityId: string;
    action: string;
    changes?: unknown;
    performedBy?: string;
    performedByType: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void>;
  listAuditLogs(opts?: { limit?: number; action?: string; entityType?: string }): Promise<Array<AuditLog & { performedByEmail?: string | null }>>;
  getAuditLog(id: string): Promise<(AuditLog & { performedByEmail?: string | null }) | undefined>;
  findRevertOf(originalId: string): Promise<AuditLog | undefined>;

  // Password reset
  createPasswordResetToken(userId: string): Promise<string>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;

  // Points expiry
  getPointsExpiryInfo(userId: string): Promise<{ expiryDate: Date | null; daysRemaining: number | null; isExpired: boolean; pointsAtRisk: number }>;
  checkAndExpirePoints(userId: string): Promise<{ expired: boolean; pointsExpired: number }>;
  runExpiryForAllUsers(): Promise<{ processed: number; expired: number }>;
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

  async createUserWithEmail(userData: { email: string; password: string; firstName: string; lastName: string; phoneNumber: string; currentPlan?: string; termsVersion?: string }): Promise<User> {
    // All new members start at Starter tier — tier progresses via receipt scanning
    const membershipTier = 'starter';

    const [newUser] = await db
      .insert(users)
      .values({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        currentPlan: userData.currentPlan || null,
        totalPoints: 0, // Start with 0 points - welcome bonus added via transaction
        membershipTier,
        isActive: true,
        isVerified: false, // must verify email + phone before access is granted
        emailNotifications: true,
        pushNotifications: false,
        marketingMessages: true,
        termsAcceptedAt: new Date(),
        termsVersion: userData.termsVersion || null,
      })
      .returning();

    return newUser;
  }

  async createEmailVerification(data: { userId: string; email: string; phoneNumber: string; codeHash: string; expiresAt: Date }): Promise<EmailVerification> {
    // Invalidate any pending verifications for this user before issuing a new one.
    await this.invalidateUserVerifications(data.userId);
    const [row] = await db
      .insert(emailVerifications)
      .values({
        userId: data.userId,
        email: data.email,
        phoneNumber: data.phoneNumber,
        codeHash: data.codeHash,
        expiresAt: data.expiresAt,
      })
      .returning();
    return row;
  }

  async getActiveEmailVerification(userId: string): Promise<EmailVerification | undefined> {
    const [row] = await db
      .select()
      .from(emailVerifications)
      .where(and(eq(emailVerifications.userId, userId), eq(emailVerifications.consumed, false)))
      .orderBy(desc(emailVerifications.createdAt))
      .limit(1);
    return row;
  }

  async incrementVerificationAttempts(id: string): Promise<void> {
    await db
      .update(emailVerifications)
      .set({ attempts: sql`${emailVerifications.attempts} + 1` })
      .where(eq(emailVerifications.id, id));
  }

  async markVerificationConsumed(id: string): Promise<void> {
    await db
      .update(emailVerifications)
      .set({ consumed: true })
      .where(eq(emailVerifications.id, id));
  }

  async markUserVerified(userId: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ isVerified: true, emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async invalidateUserVerifications(userId: string): Promise<void> {
    await db
      .update(emailVerifications)
      .set({ consumed: true })
      .where(and(eq(emailVerifications.userId, userId), eq(emailVerifications.consumed, false)));
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

    // When points are earned (not expiry/redemption), refresh the 12-month expiry date
    if ((transaction.pointsEarned || 0) > 0 && transaction.type !== 'expiry') {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      await db
        .update(users)
        .set({ pointsExpiryDate: expiryDate, updatedAt: new Date() })
        .where(eq(users.id, transaction.userId));
    }

    return newTransaction;
  }

  /**
   * Receipt awards must observe and update a member's balance as one unit. The
   * user row lock makes the before/after threshold calculation serializable for
   * concurrent uploads by the same member.
   */
  async awardReceiptPoints(
    transaction: InsertTransaction,
    receiptUploadId: string,
    receiptUpdates: Partial<ReceiptUpload>,
  ): Promise<{
    transaction: Transaction;
    receipt: ReceiptUpload;
    newlyQualifiedRewards: NewlyQualifiedReward[];
  }> {
    return db.transaction(async (tx) => {
      const [userBeforeAward] = await tx
        .select()
        .from(users)
        .where(eq(users.id, transaction.userId))
        .for("update");
      if (!userBeforeAward) {
        throw new Error("User account not found");
      }

      const [createdTransaction] = await tx
        .insert(transactions)
        .values(transaction)
        .returning();
      const pointsEarned = transaction.pointsEarned || 0;
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      const [userAfterAward] = await tx
        .update(users)
        .set({
          totalPoints: sql`${users.totalPoints} + ${pointsEarned}`,
          pointsExpiryDate: expiryDate,
          updatedAt: new Date(),
        })
        .where(eq(users.id, transaction.userId))
        .returning();

      const activeRewards = await tx
        .select()
        .from(rewards)
        .where(and(
          eq(rewards.isActive, true),
          sql`${rewards.validUntil} IS NULL OR ${rewards.validUntil} > NOW()`,
        ))
        .orderBy(rewards.pointsCost);
      const newlyQualifiedRewards = findNewlyQualifiedRewards(
        activeRewards,
        userBeforeAward.totalPoints ?? 0,
        userAfterAward.totalPoints ?? 0,
      );

      for (const reward of newlyQualifiedRewards) {
        await tx.insert(rewardNotifications).values({
          userId: transaction.userId,
          rewardId: reward.id,
          sourceTransactionId: createdTransaction.id,
          status: "pending",
        });
      }

      const [updatedReceipt] = await tx
        .update(receiptUploads)
        .set({
          ...receiptUpdates,
          transactionId: createdTransaction.id,
          status: "completed",
        })
        .where(and(
          eq(receiptUploads.id, receiptUploadId),
          eq(receiptUploads.userId, transaction.userId),
        ))
        .returning();
      if (!updatedReceipt) {
        throw new Error("Receipt upload not found");
      }

      return {
        transaction: createdTransaction,
        receipt: updatedReceipt,
        newlyQualifiedRewards,
      };
    });
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

  async createRewardNotification(
    notification: InsertRewardNotification,
  ): Promise<RewardNotification> {
    const [created] = await db
      .insert(rewardNotifications)
      .values(notification)
      .returning();
    return created;
  }

  async getPendingRewardNotifications(
    userId: string,
  ): Promise<PendingRewardNotification[]> {
    return await db
      .select({
        id: rewardNotifications.id,
        userId: rewardNotifications.userId,
        rewardId: rewardNotifications.rewardId,
        sourceTransactionId: rewardNotifications.sourceTransactionId,
        status: rewardNotifications.status,
        createdAt: rewardNotifications.createdAt,
        resolvedAt: rewardNotifications.resolvedAt,
        name: rewards.name,
        pointsCost: rewards.pointsCost,
        category: rewards.category,
        imageUrl: rewards.imageUrl,
      })
      .from(rewardNotifications)
      .innerJoin(rewards, eq(rewardNotifications.rewardId, rewards.id))
      .where(
        and(
          eq(rewardNotifications.userId, userId),
          eq(rewardNotifications.status, 'pending'),
        ),
      )
      .orderBy(rewardNotifications.createdAt);
  }

  async getRewardNotification(
    id: string,
    userId: string,
  ): Promise<RewardNotification | undefined> {
    const [notification] = await db
      .select()
      .from(rewardNotifications)
      .where(and(
        eq(rewardNotifications.id, id),
        eq(rewardNotifications.userId, userId),
      ));
    return notification;
  }

  async resolveRewardNotification(
    id: string,
    userId: string,
    status: 'redeemed' | 'dismissed',
  ): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [notification] = await tx
        .select()
        .from(rewardNotifications)
        .where(and(
          eq(rewardNotifications.id, id),
          eq(rewardNotifications.userId, userId),
        ))
        .for("update");
      if (!notification) return false;
      if (notification.status === status) return true;
      if (notification.status !== "pending") return false;
      await tx.update(rewardNotifications)
        .set({ status, resolvedAt: new Date() })
        .where(eq(rewardNotifications.id, id));
      return true;
    });
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

  async redeemReward(
    userId: string,
    rewardId: string,
    notificationId?: string,
  ): Promise<{ redemption: Redemption; idempotent: boolean }> {
    return db.transaction(async (tx) => {
      let notification: RewardNotification | undefined;
      if (notificationId) {
        [notification] = await tx
          .select()
          .from(rewardNotifications)
          .where(and(
            eq(rewardNotifications.id, notificationId),
            eq(rewardNotifications.userId, userId),
          ))
          .for("update");
        if (!notification || notification.rewardId !== rewardId) {
          throw new RedemptionOperationError("Reward notification not found");
        }
        if (notification.status === "dismissed") {
          throw new RedemptionOperationError("Reward notification is dismissed");
        }
        if (notification.status === "redeemed") {
          const [existing] = await tx
            .select()
            .from(redemptions)
            .where(and(
              eq(redemptions.userId, userId),
              eq(redemptions.rewardId, rewardId),
              gte(redemptions.redeemedAt, notification.createdAt!),
            ))
            .orderBy(desc(redemptions.redeemedAt))
            .limit(1);
          if (existing) return { redemption: existing, idempotent: true };
          throw new RedemptionOperationError("Reward notification has no redemption", 409);
        }
      }

      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
      if (!user) throw new RedemptionOperationError("User not found", 404);
      const [reward] = await tx
        .select()
        .from(rewards)
        .where(and(
          eq(rewards.id, rewardId),
          eq(rewards.isActive, true),
          sql`${rewards.validUntil} IS NULL OR ${rewards.validUntil} > NOW()`,
        ))
        .for("update");
      if (!reward || reward.pointsCost <= 0) {
        throw new RedemptionOperationError("Reward is not available");
      }
      if ((user.totalPoints ?? 0) < reward.pointsCost) {
        throw new RedemptionOperationError("Insufficient points");
      }

      const redemptionCode = `RDM-${randomUUID().slice(0, 8).toUpperCase()}`;
      const [redemption] = await tx.insert(redemptions).values({
        userId,
        rewardId: reward.id,
        pointsSpent: reward.pointsCost,
        redemptionCode,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }).returning();
      await tx.insert(transactions).values({
        userId,
        type: "redemption",
        pointsSpent: reward.pointsCost,
        description: `Redeemed reward: ${redemption.id}`,
        status: "completed",
      });
      await tx.update(users).set({
        totalPoints: sql`${users.totalPoints} - ${reward.pointsCost}`,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));
      await tx.update(rewards).set({
        redemptionCount: sql`${rewards.redemptionCount} + 1`,
      }).where(eq(rewards.id, reward.id));
      if (notification) {
        await tx.update(rewardNotifications).set({
          status: "redeemed",
          resolvedAt: new Date(),
        }).where(eq(rewardNotifications.id, notification.id));
      }
      return { redemption, idempotent: false };
    });
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

  async createReceiptUpload(upload: InsertReceiptUpload): Promise<ReceiptUpload> {
    const [newUpload] = await db
      .insert(receiptUploads)
      .values(upload)
      .returning();
    return newUpload;
  }

  async getReceiptUploadByHash(
    userId: string,
    fileHash: string,
  ): Promise<ReceiptUpload | undefined> {
    const [upload] = await db
      .select()
      .from(receiptUploads)
      .where(
        and(
          eq(receiptUploads.userId, userId),
          eq(receiptUploads.fileHash, fileHash),
        ),
      );
    return upload;
  }

  async deleteReceiptUpload(id: string): Promise<void> {
    await db.delete(receiptUploads).where(eq(receiptUploads.id, id));
  }

  async getUserReceiptUploads(userId: string, limit: number = 50): Promise<ReceiptUpload[]> {
    return await db
      .select()
      .from(receiptUploads)
      .where(eq(receiptUploads.userId, userId))
      .orderBy(desc(receiptUploads.createdAt))
      .limit(limit);
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceSubmission | undefined> {
    const [row] = await db
      .select()
      .from(invoiceSubmissions)
      .where(eq(invoiceSubmissions.invoiceNumber, invoiceNumber));
    return row;
  }

  async createInvoiceSubmission(submission: InsertInvoiceSubmission): Promise<InvoiceSubmission> {
    const [created] = await db
      .insert(invoiceSubmissions)
      .values(submission)
      .returning();
    return created;
  }

  async awardInvoicePoints(
    submission: InsertInvoiceSubmission,
    transaction: Omit<InsertTransaction, "userId">,
  ): Promise<{ submission: InvoiceSubmission; transaction: Transaction; user: User }> {
    return db.transaction(async (tx) => {
      const [createdSubmission] = await tx
        .insert(invoiceSubmissions)
        .values(submission)
        .returning();

      const [createdTransaction] = await tx
        .insert(transactions)
        .values({ ...transaction, userId: submission.userId })
        .returning();

      const pointsChange =
        (transaction.pointsEarned ?? 0) - (transaction.pointsSpent ?? 0);
      const expiryDate =
        (transaction.pointsEarned ?? 0) > 0 && transaction.type !== "expiry"
          ? new Date(new Date().setFullYear(new Date().getFullYear() + 1))
          : undefined;
      const [updatedUser] = await tx
        .update(users)
        .set({
          totalPoints: sql`COALESCE(${users.totalPoints}, 0) + ${pointsChange}`,
          ...(expiryDate ? { pointsExpiryDate: expiryDate } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, submission.userId))
        .returning();

      if (!updatedUser) {
        throw new Error("Cannot award invoice points: user account not found");
      }

      return {
        submission: createdSubmission,
        transaction: createdTransaction,
        user: updatedUser,
      };
    });
  }

  async getUserInvoiceSubmissions(userId: string, limit: number = 50): Promise<InvoiceSubmission[]> {
    return await db
      .select()
      .from(invoiceSubmissions)
      .where(eq(invoiceSubmissions.userId, userId))
      .orderBy(desc(invoiceSubmissions.submittedAt))
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

  async getAdminByUserId(userId: string): Promise<AdminUser | null> {
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.userId, userId))
      .limit(1);
    return admin || null;
  }

  async getAdminById(adminId: string): Promise<AdminUser | null> {
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, adminId))
      .limit(1);
    return admin || null;
  }

  async listAdminUsers(): Promise<AdminUser[]> {
    return await db
      .select()
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt));
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [newAdmin] = await db.insert(adminUsers).values(admin).returning();
    return newAdmin;
  }

  async updateAdminUser(adminId: string, updates: Partial<AdminUser>): Promise<AdminUser> {
    const [updated] = await db
      .update(adminUsers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(adminUsers.id, adminId))
      .returning();
    return updated;
  }

  async deactivateAdmin(adminId: string): Promise<void> {
    await db
      .update(adminUsers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(adminUsers.id, adminId));
  }

  async deactivateUser(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async softDeactivateReward(rewardId: string): Promise<void> {
    await db
      .update(rewards)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(rewards.id, rewardId));
  }

  async getPointsExpiryInfo(userId: string): Promise<{ expiryDate: Date | null; daysRemaining: number | null; isExpired: boolean; pointsAtRisk: number }> {
    const user = await this.getUser(userId);
    if (!user) return { expiryDate: null, daysRemaining: null, isExpired: false, pointsAtRisk: 0 };

    const expiryDate = user.pointsExpiryDate ? new Date(user.pointsExpiryDate) : null;
    const pointsAtRisk = user.totalPoints || 0;

    if (!expiryDate) {
      return { expiryDate: null, daysRemaining: null, isExpired: false, pointsAtRisk };
    }

    const now = new Date();
    const msRemaining = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    const isExpired = msRemaining <= 0;

    return { expiryDate, daysRemaining, isExpired, pointsAtRisk };
  }

  async checkAndExpirePoints(userId: string): Promise<{ expired: boolean; pointsExpired: number }> {
    const info = await this.getPointsExpiryInfo(userId);

    if (!info.isExpired || info.pointsAtRisk === 0) {
      return { expired: false, pointsExpired: 0 };
    }

    const pointsToExpire = info.pointsAtRisk;

    await this.createTransaction({
      userId,
      type: 'expiry',
      description: 'Points expired due to 12 months of inactivity',
      amount: '0.00',
      pointsEarned: 0,
      pointsSpent: pointsToExpire,
      status: 'completed',
      orderId: `EXPIRY-${userId.substring(0, 8)}-${Date.now()}`,
    });

    // Clear the expiry date since all points are now gone
    await db
      .update(users)
      .set({ pointsExpiryDate: null, updatedAt: new Date() })
      .where(eq(users.id, userId));

    console.log(`[Points Expiry] Expired ${pointsToExpire} points for user ${userId}`);
    return { expired: true, pointsExpired: pointsToExpire };
  }

  async runExpiryForAllUsers(): Promise<{ processed: number; expired: number }> {
    const now = new Date();
    const expiredUsers = await db
      .select({ id: users.id, totalPoints: users.totalPoints })
      .from(users)
      .where(
        and(
          sql`${users.pointsExpiryDate} IS NOT NULL`,
          sql`${users.pointsExpiryDate} < ${now.toISOString()}`,
          sql`${users.totalPoints} > 0`
        )
      );

    let expiredCount = 0;
    for (const user of expiredUsers) {
      const result = await this.checkAndExpirePoints(user.id);
      if (result.expired) expiredCount++;
    }

    return { processed: expiredUsers.length, expired: expiredCount };
  }

  async createAuditLog(entry: {
    entityType: string;
    entityId: string;
    action: string;
    changes?: unknown;
    performedBy?: string;
    performedByType: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await db.insert(auditLogs).values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      changes: entry.changes as any,
      performedBy: entry.performedBy,
      performedByType: entry.performedByType,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    });
  }

  async listAuditLogs(opts: { limit?: number; action?: string; entityType?: string } = {}): Promise<Array<AuditLog & { performedByEmail?: string | null; revertedAt?: string | null }>> {
    const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
    const conditions: any[] = [];
    if (opts.action) conditions.push(eq(auditLogs.action, opts.action));
    if (opts.entityType) conditions.push(eq(auditLogs.entityType, opts.entityType));

    const rows = await db
      .select({
        id: auditLogs.id,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        action: auditLogs.action,
        changes: auditLogs.changes,
        performedBy: auditLogs.performedBy,
        performedByType: auditLogs.performedByType,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        sessionId: auditLogs.sessionId,
        timestamp: auditLogs.timestamp,
        performedByEmail: adminUsers.email,
        revertedAt: sql<string | null>`(
          SELECT r.timestamp FROM ${auditLogs} r
          WHERE r.action = 'reset_contact_revert'
            AND r.changes->>'revertOf' = ${auditLogs.id}::text
          LIMIT 1
        )`,
      })
      .from(auditLogs)
      .leftJoin(adminUsers, eq(adminUsers.id, auditLogs.performedBy))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    return rows as any;
  }

  async getAuditLog(id: string): Promise<(AuditLog & { performedByEmail?: string | null }) | undefined> {
    const [row] = await db
      .select({
        id: auditLogs.id,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        action: auditLogs.action,
        changes: auditLogs.changes,
        performedBy: auditLogs.performedBy,
        performedByType: auditLogs.performedByType,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        sessionId: auditLogs.sessionId,
        timestamp: auditLogs.timestamp,
        performedByEmail: adminUsers.email,
      })
      .from(auditLogs)
      .leftJoin(adminUsers, eq(adminUsers.id, auditLogs.performedBy))
      .where(eq(auditLogs.id, id))
      .limit(1);
    return row as any;
  }

  async findRevertOf(originalId: string): Promise<AuditLog | undefined> {
    const [row] = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, "reset_contact_revert"),
          sql`${auditLogs.changes}->>'revertOf' = ${originalId}`,
        )
      )
      .limit(1);
    return row;
  }

  async createPasswordResetToken(userId: string): Promise<string> {
    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
      used: false,
    });

    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    return record;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
