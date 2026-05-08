import { db } from '../db';
import { campaigns, users, type InsertCampaign, type Campaign } from '@shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export interface CampaignRules {
  pointsMultiplier?: number;
  bonusPoints?: number;
  minSpend?: number;
  maxParticipations?: number;
  eligibleTiers?: string[];
  eligibleCategories?: string[];
}

export interface CampaignTargetAudience {
  tiers?: string[];
  minPoints?: number;
  maxPoints?: number;
  registrationDateRange?: {
    start: Date;
    end: Date;
  };
  hasRecentActivity?: boolean;
}

export class CampaignService {
  
  // Create a new campaign
  async createCampaign(campaignData: InsertCampaign): Promise<string> {
    const [campaign] = await db
      .insert(campaigns)
      .values({
        ...campaignData,
        status: 'draft',
        currentParticipants: 0,
      })
      .returning({ id: campaigns.id });

    return campaign.id;
  }

  // Update campaign
  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<boolean> {
    const result = await db
      .update(campaigns)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    return (result.rowCount ?? 0) > 0;
  }

  // Activate campaign
  async activateCampaign(campaignId: string): Promise<boolean> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));

    if (!campaign || campaign.status !== 'draft') {
      return false;
    }

    // Update campaign status
    await db
      .update(campaigns)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    // Notify eligible users
    await this.notifyEligibleUsers(campaign);

    return true;
  }

  // Get active campaigns
  async getActiveCampaigns(): Promise<Campaign[]> {
    const now = new Date();
    
    return await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.status, 'active'),
          lte(campaigns.startDate, now),
          gte(campaigns.endDate, now)
        )
      );
  }

  // Check if user is eligible for campaign
  async isUserEligibleForCampaign(userId: string, campaignId: string): Promise<boolean> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));

    if (!campaign || campaign.status !== 'active') {
      return false;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return false;
    }

    // Check target audience criteria
    const targetAudience = campaign.targetAudience as CampaignTargetAudience;
    
    if (targetAudience) {
      // Check tier eligibility
      if (targetAudience.tiers && !targetAudience.tiers.includes(user.membershipTier || 'bronze')) {
        return false;
      }

      // Check points range
      if (targetAudience.minPoints && (user.totalPoints ?? 0) < targetAudience.minPoints) {
        return false;
      }

      if (targetAudience.maxPoints && (user.totalPoints ?? 0) > targetAudience.maxPoints) {
        return false;
      }

      // Check registration date
      if (targetAudience.registrationDateRange && user.memberSince) {
        const memberSince = user.memberSince;
        if (memberSince < targetAudience.registrationDateRange.start || 
            memberSince > targetAudience.registrationDateRange.end) {
          return false;
        }
      }
    }

    // Check participation limits
    if (campaign.maxParticipants && (campaign.currentParticipants ?? 0) >= campaign.maxParticipants) {
      return false;
    }

    return true;
  }

  // Apply campaign benefits to transaction
  async applyCampaignBenefits(userId: string, transactionAmount: number, category?: string): Promise<{
    bonusPoints: number;
    appliedCampaigns: string[];
  }> {
    const activeCampaigns = await this.getActiveCampaigns();
    let totalBonusPoints = 0;
    const appliedCampaigns: string[] = [];

    for (const campaign of activeCampaigns) {
      if (await this.isUserEligibleForCampaign(userId, campaign.id)) {
        const rules = campaign.rules as CampaignRules;
        
        if (rules) {
          // Check minimum spend requirement
          if (rules.minSpend && transactionAmount < rules.minSpend) {
            continue;
          }

          // Check category eligibility
          if (rules.eligibleCategories && category && !rules.eligibleCategories.includes(category)) {
            continue;
          }

          // Calculate bonus points
          let bonusPoints = 0;
          
          if (rules.pointsMultiplier) {
            // Generic multiplier baseline (1 pt/R1) for non-airtime categories.
            // Airtime receipts use receiptProcessor's 2 pts/R1 directly and bypass this path.
            bonusPoints = Math.floor(transactionAmount * (rules.pointsMultiplier - 1));
          }

          if (rules.bonusPoints) {
            bonusPoints += rules.bonusPoints;
          }

          if (bonusPoints > 0) {
            totalBonusPoints += bonusPoints;
            appliedCampaigns.push(campaign.id);

            // Update campaign participation count
            await db
              .update(campaigns)
              .set({
                currentParticipants: sql`${campaigns.currentParticipants} + 1`,
              })
              .where(eq(campaigns.id, campaign.id));
          }
        }
      }
    }

    return {
      bonusPoints: totalBonusPoints,
      appliedCampaigns,
    };
  }

  // Get campaign analytics
  async getCampaignAnalytics(campaignId: string): Promise<{
    participationRate: number;
    totalEngagement: number;
    averageSpend: number;
    roi: number;
  }> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // TODO: Implement proper analytics calculations
    // This would involve querying transactions, user engagement, etc.
    
    return {
      participationRate: 0,
      totalEngagement: campaign.currentParticipants ?? 0,
      averageSpend: 0,
      roi: 0,
    };
  }

  // Notify eligible users about campaign
  private async notifyEligibleUsers(campaign: Campaign): Promise<void> {
    // Notification system removed - campaigns will notify users through other channels
    console.log(`Campaign ${campaign.name} activated - notification skipped`);
  }

  // End campaign
  async endCampaign(campaignId: string): Promise<boolean> {
    const result = await db
      .update(campaigns)
      .set({
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    return (result.rowCount ?? 0) > 0;
  }

  // Get all campaigns with pagination
  async getCampaigns(page = 1, limit = 20): Promise<{
    campaigns: Campaign[];
    total: number;
    hasMore: boolean;
  }> {
    const offset = (page - 1) * limit;
    
    const campaignList: Campaign[] = await db
      .select()
      .from(campaigns)
      .orderBy(campaigns.createdAt)
      .limit(limit + 1)
      .offset(offset);

    const hasMore: boolean = campaignList.length > limit;
    const resultCampaigns: Campaign[] = hasMore ? campaignList.slice(0, -1) : campaignList;

    return {
      campaigns: resultCampaigns,
      total: resultCampaigns.length,
      hasMore,
    };
  }
}

export const campaignService = new CampaignService();