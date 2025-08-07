import {
  users,
  rewards,
  transactions,
  redemptions,
  offers,
  socialConnections,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPoints(userId: string, pointsChange: number): Promise<User>;
  updateUserProfile(userId: string, updates: Partial<User>): Promise<User>;
  
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
}

export const storage = new DatabaseStorage();
