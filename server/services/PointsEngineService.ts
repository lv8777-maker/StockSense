import { db } from '../db';
import {
  earningRules,
  transactions,
  users,
  loyaltyAccounts,
  type EarningRule,
  type InsertTransaction,
  type User
} from '@shared/schema';
import { eq, and, gte, lte, sum, sql } from 'drizzle-orm';
import { campaignService } from './CampaignService';

// The type `db.transaction()` hands its callback — reused so helper methods
// can accept either a live transaction or fall back to `db` itself, since
// both expose the same query-builder surface.
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | DbTransaction;

export interface PointsCalculation {
  basePoints: number;
  bonusPoints: number;
  campaignPoints: number;
  totalPoints: number;
  appliedRules: string[];
  appliedCampaigns: string[];
}

export interface TierRequirements {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

export interface TierBenefits {
  pointMultiplier: number;
  bonusRewards: string[];
  exclusiveOffers: boolean;
  freeShipping: boolean;
  prioritySupport: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  pointsAwarded: number;
  unlockedAt: Date;
}

export class PointsEngineService {
  private readonly tierRequirements: TierRequirements = {
    bronze: 0,
    silver: 1000,
    gold: 5000,
    platinum: 15000,
  };

  private readonly tierBenefits: Record<string, TierBenefits> = {
    bronze: {
      pointMultiplier: 1.0,
      bonusRewards: [],
      exclusiveOffers: false,
      freeShipping: false,
      prioritySupport: false,
    },
    silver: {
      pointMultiplier: 1.2,
      bonusRewards: ['birthday_bonus'],
      exclusiveOffers: true,
      freeShipping: false,
      prioritySupport: false,
    },
    gold: {
      pointMultiplier: 1.5,
      bonusRewards: ['birthday_bonus', 'anniversary_bonus'],
      exclusiveOffers: true,
      freeShipping: true,
      prioritySupport: false,
    },
    platinum: {
      pointMultiplier: 2.0,
      bonusRewards: ['birthday_bonus', 'anniversary_bonus', 'quarterly_bonus'],
      exclusiveOffers: true,
      freeShipping: true,
      prioritySupport: true,
    },
  };

  // Calculate points for a purchase transaction
  async calculatePoints(
    userId: string,
    transactionAmount: number,
    category?: string,
    orderId?: string
  ): Promise<PointsCalculation> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    // Get active earning rules
    const activeRules = await this.getActiveEarningRules();
    
    let basePoints = 0;
    let bonusPoints = 0;
    const appliedRules: string[] = [];

    // Apply earning rules
    for (const rule of activeRules) {
      const rulePoints = await this.applyEarningRule(rule, user, transactionAmount, category);
      if (rulePoints > 0) {
        if (rule.type === 'purchase') {
          basePoints += rulePoints;
        } else {
          bonusPoints += rulePoints;
        }
        appliedRules.push(rule.id);
      }
    }

    // Apply campaign bonuses
    const campaignResult = await campaignService.applyCampaignBenefits(
      userId,
      transactionAmount,
      category
    );

    const totalPoints = basePoints + bonusPoints + campaignResult.bonusPoints;

    return {
      basePoints,
      bonusPoints,
      campaignPoints: campaignResult.bonusPoints,
      totalPoints,
      appliedRules,
      appliedCampaigns: campaignResult.appliedCampaigns,
    };
  }

  // Apply a specific earning rule
  private async applyEarningRule(
    rule: EarningRule,
    user: User,
    transactionAmount: number,
    category?: string
  ): Promise<number> {
    const conditions = rule.conditions as any;
    
    // Check if rule conditions are met
    if (conditions?.minSpend && transactionAmount < conditions.minSpend) {
      return 0;
    }

    if (conditions?.categories && category && !conditions.categories.includes(category)) {
      return 0;
    }

    if (conditions?.eligibleTiers && !conditions.eligibleTiers.includes(user.membershipTier || 'bronze')) {
      return 0;
    }

    // Check daily/monthly limits
    if (rule.maxPointsPerDay || rule.maxPointsPerMonth) {
      const earnedToday = await this.getPointsEarnedToday(user.id, rule.id);
      const earnedThisMonth = await this.getPointsEarnedThisMonth(user.id, rule.id);

      if (rule.maxPointsPerDay && earnedToday >= rule.maxPointsPerDay) {
        return 0;
      }

      if (rule.maxPointsPerMonth && earnedThisMonth >= rule.maxPointsPerMonth) {
        return 0;
      }
    }

    // Calculate base points
    let points = rule.pointsAwarded || 0;
    
    // Apply multiplier
    const multiplier = rule.multiplier ? parseFloat(rule.multiplier.toString()) : 1;
    points = Math.floor(points * multiplier);

    // Apply tier-specific multipliers
    const tierMultipliers = rule.tierMultipliers as any;
    if (tierMultipliers && tierMultipliers[user.membershipTier || 'bronze']) {
      const tierMultiplier = parseFloat(tierMultipliers[user.membershipTier || 'bronze']);
      points = Math.floor(points * tierMultiplier);
    }

    // For purchase rules, calculate based on amount
    if (rule.type === 'purchase' && rule.pointsAwarded) {
      points = Math.floor(transactionAmount * (rule.pointsAwarded / 100) * multiplier);
    }

    return Math.max(0, points);
  }

  // Record a transaction and award points. Wrapped in a single DB transaction
  // so the transaction-log insert, the user/loyalty-account point balances,
  // and the tier check either all land together or none do.
  async recordTransaction(
    userId: string,
    transactionData: {
      type: string;
      amount?: number;
      description: string;
      orderId?: string;
      category?: string;
    }
  ): Promise<string> {
    const pointsCalc = transactionData.amount
      ? await this.calculatePoints(userId, transactionData.amount, transactionData.category, transactionData.orderId)
      : { totalPoints: 0, basePoints: 0, bonusPoints: 0, campaignPoints: 0, appliedRules: [], appliedCampaigns: [] };

    const insertedId = await db.transaction(async (tx) => {
      let transactionRow: { id: string } | undefined;
      try {
        [transactionRow] = await tx
          .insert(transactions)
          .values({
            userId,
            type: transactionData.type,
            amount: transactionData.amount?.toString(),
            pointsEarned: pointsCalc.totalPoints,
            description: transactionData.description,
            orderId: transactionData.orderId,
            status: 'completed',
          })
          .returning({ id: transactions.id });
      } catch (e: any) {
        if (e?.code === '23505' && transactionData.orderId) {
          // Duplicate (userId, orderId) — another request already recorded this
          // order. Treat as an idempotency guard, not a hard error, and stop
          // here: don't double-award points on top of the winning request.
          // (A caught error still leaves the transaction aborted, so nothing
          // else can run on `tx` — resolve the existing row after we exit.)
          return null;
        }
        throw e;
      }

      // Update user's total points
      await tx
        .update(users)
        .set({
          totalPoints: sql`${users.totalPoints} + ${pointsCalc.totalPoints}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Update loyalty account if exists
      await this.updateLoyaltyAccount(tx, userId, pointsCalc.totalPoints);

      // Check for tier upgrades
      await this.checkTierUpgradeInTx(tx, userId);

      // Notification system removed - points earned will be tracked in transaction history

      return transactionRow.id;
    });

    if (insertedId) return insertedId;

    // Duplicate-orderId path: the transaction that actually landed committed
    // under the same (userId, orderId) pair — look it up outside the aborted
    // transaction and hand its id back so this call stays idempotent for the
    // caller too.
    const [existing] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.orderId, transactionData.orderId!)));
    if (existing) return existing.id;

    throw new Error(`Duplicate orderId ${transactionData.orderId} for user ${userId}, but no existing transaction found`);
  }

  // Update loyalty account points. Always called from within an active
  // transaction (see recordTransaction) so the read-then-write here is
  // consistent with the caller's other writes.
  private async updateLoyaltyAccount(tx: Executor, userId: string, pointsToAdd: number): Promise<void> {
    const [existingAccount] = await tx
      .select()
      .from(loyaltyAccounts)
      .where(eq(loyaltyAccounts.userId, userId));

    if (existingAccount) {
      await tx
        .update(loyaltyAccounts)
        .set({
          availablePoints: sql`${loyaltyAccounts.availablePoints} + ${pointsToAdd}`,
          lifetimePoints: sql`${loyaltyAccounts.lifetimePoints} + ${pointsToAdd}`,
          lastActivityDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.userId, userId));
    } else {
      // Create new loyalty account
      const accountNumber = await this.generateAccountNumber();
      await tx
        .insert(loyaltyAccounts)
        .values({
          userId,
          accountNumber,
          availablePoints: pointsToAdd,
          lifetimePoints: pointsToAdd,
          currentTier: 'bronze',
          tierProgress: '0.00',
          lastActivityDate: new Date(),
        });
    }
  }

  // Public entry point for standalone tier checks (no external callers today,
  // kept for API compatibility) — opens its own transaction so the tier
  // update and the loyalty-account update land together.
  async checkTierUpgrade(userId: string): Promise<void> {
    await db.transaction((tx) => this.checkTierUpgradeInTx(tx, userId));
  }

  // Check and process tier upgrades against the given executor. Called with
  // an active tx from recordTransaction so it's atomic with the points
  // update above it; called with a fresh transaction from checkTierUpgrade.
  private async checkTierUpgradeInTx(tx: Executor, userId: string): Promise<void> {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return;

    const currentPoints = user.totalPoints ?? 0;
    const currentTier = user.membershipTier || 'bronze';
    let newTier = currentTier;

    // Determine new tier based on points
    if (currentPoints >= this.tierRequirements.platinum) {
      newTier = 'platinum';
    } else if (currentPoints >= this.tierRequirements.gold) {
      newTier = 'gold';
    } else if (currentPoints >= this.tierRequirements.silver) {
      newTier = 'silver';
    } else {
      newTier = 'bronze';
    }

    // Update tier if changed
    if (newTier !== currentTier) {
      await tx
        .update(users)
        .set({
          membershipTier: newTier,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Update loyalty account
      const tierProgress = this.calculateTierProgress(currentPoints, newTier);
      await tx
        .update(loyaltyAccounts)
        .set({
          currentTier: newTier,
          tierProgress: tierProgress.toString(),
          tierStartDate: new Date(),
          nextTierRequirement: this.getNextTierRequirement(newTier),
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.userId, userId));

      // Notification system removed - tier upgrade visible in user profile
      console.log(`User ${userId} upgraded from ${currentTier} to ${newTier}`);
    }
  }

  // Calculate tier progress percentage
  private calculateTierProgress(points: number, currentTier: string): number {
    const tiers = Object.keys(this.tierRequirements) as (keyof TierRequirements)[];
    const currentIndex = tiers.indexOf(currentTier as keyof TierRequirements);
    
    if (currentIndex === tiers.length - 1) {
      return 100; // Max tier reached
    }

    const nextTier = tiers[currentIndex + 1];
    const currentTierPoints = this.tierRequirements[currentTier as keyof TierRequirements];
    const nextTierPoints = this.tierRequirements[nextTier];
    
    const progress = ((points - currentTierPoints) / (nextTierPoints - currentTierPoints)) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  // Get next tier requirement
  private getNextTierRequirement(currentTier: string): number | null {
    const tiers = Object.keys(this.tierRequirements) as (keyof TierRequirements)[];
    const currentIndex = tiers.indexOf(currentTier as keyof TierRequirements);
    
    if (currentIndex < tiers.length - 1) {
      const nextTier = tiers[currentIndex + 1];
      return this.tierRequirements[nextTier];
    }
    
    return null; // Already at max tier
  }

  // Generate unique account number
  private async generateAccountNumber(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MAV-${timestamp.slice(-8)}${random}`;
  }

  // Get active earning rules
  private async getActiveEarningRules(): Promise<EarningRule[]> {
    const now = new Date();
    return await db
      .select()
      .from(earningRules)
      .where(
        and(
          eq(earningRules.isActive, true),
          lte(earningRules.validFrom, now),
          sql`(${earningRules.validUntil} IS NULL OR ${earningRules.validUntil} > ${now})`
        )
      );
  }

  // Get points earned today for a specific rule
  private async getPointsEarnedToday(userId: string, ruleId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ total: sum(transactions.pointsEarned) })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.createdAt, today),
          sql`${transactions.description} LIKE '%${ruleId}%'` // Simple rule tracking
        )
      );

    return parseInt(result[0]?.total?.toString() ?? '0');
  }

  // Get points earned this month for a specific rule
  private async getPointsEarnedThisMonth(userId: string, ruleId: string): Promise<number> {
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ total: sum(transactions.pointsEarned) })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.createdAt, firstDayOfMonth),
          sql`${transactions.description} LIKE '%${ruleId}%'` // Simple rule tracking
        )
      );

    return parseInt(result[0]?.total?.toString() ?? '0');
  }

  // Deduct points for redemption. Wrapped in a transaction with a row lock on
  // the user so two concurrent redemptions can't both pass the balance check
  // against the same stale totalPoints value and drive the balance negative.
  async deductPoints(userId: string, points: number, description: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Lock the user row for the life of this transaction — mirrors the
      // FOR UPDATE pattern in server/verificationAuth.ts:65-129.
      const lockResult: any = await tx.execute(sql`
        SELECT total_points
        FROM users
        WHERE id = ${userId}
        FOR UPDATE
      `);
      const rows = lockResult.rows ?? lockResult;
      const raw = rows?.[0] as Record<string, any> | undefined;

      if (!raw) return false;
      const currentPoints = Number(raw.total_points ?? raw.totalPoints ?? 0);
      if (currentPoints < points) return false;

      // Create deduction transaction
      await tx
        .insert(transactions)
        .values({
          userId,
          type: 'redemption',
          pointsSpent: points,
          description,
          status: 'completed',
        });

      // Update user points
      await tx
        .update(users)
        .set({
          totalPoints: sql`${users.totalPoints} - ${points}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Update loyalty account
      await tx
        .update(loyaltyAccounts)
        .set({
          availablePoints: sql`${loyaltyAccounts.availablePoints} - ${points}`,
          lastActivityDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.userId, userId));

      return true;
    });
  }
}

export const pointsEngineService = new PointsEngineService();