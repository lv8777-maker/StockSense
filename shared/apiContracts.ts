import { z } from "zod";

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();
const dateString = z.string().datetime();

export const userResponseSchema = z.object({
  id: z.string(),
  email: nullableString,
  firstName: nullableString,
  lastName: nullableString,
  currentPlan: nullableString,
  membershipTier: nullableString,
  totalPoints: nullableNumber,
}).passthrough();

export const rewardResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: nullableString,
  pointsCost: z.number(),
  category: z.string(),
  imageUrl: nullableString,
  isActive: z.boolean().nullable(),
  redemptionCount: nullableNumber,
  maxRedemptions: nullableNumber,
  validUntil: dateString.nullable(),
  createdAt: dateString.nullable(),
  updatedAt: dateString.nullable(),
}).passthrough();

export const transactionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  amount: nullableString,
  pointsEarned: nullableNumber,
  pointsSpent: nullableNumber,
  description: z.string(),
  orderId: nullableString,
  status: nullableString,
  createdAt: dateString.nullable(),
}).passthrough();

export const dashboardStatsResponseSchema = z.object({
  totalPoints: z.number(),
  pointsThisMonth: z.number(),
  totalTransactions: z.number(),
  recentRedemptions: z.number(),
  currentTier: z.string(),
  nextTier: z.string().nullable(),
  pointsToNext: z.number(),
  tierProgress: z.number(),
});

export const dashboardActivityResponseSchema = z.array(z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  points: z.number(),
  date: dateString,
  status: z.string().nullable(),
}));

export const pointsExpiryResponseSchema = z.object({
  expiryDate: dateString.nullable(),
  daysRemaining: nullableNumber,
  isExpired: z.boolean(),
  pointsAtRisk: z.number(),
});

export const transactionStatsResponseSchema = z.object({
  totalPurchases: z.number(),
  totalSpent: z.string(),
  totalPointsEarned: z.number(),
});

export const adminStatsResponseSchema = z.object({
  totalCustomers: z.number(),
  activeRewards: z.number(),
  totalPointsRedeemed: z.number(),
  monthlyRevenue: z.string(),
});

export const campaignResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: nullableString,
  type: z.string(),
  status: z.string().nullable(),
  startDate: dateString.nullable(),
  endDate: dateString.nullable(),
  currentParticipants: nullableNumber,
  maxParticipants: nullableNumber,
  rules: z.unknown().nullable(),
  targetAudience: z.unknown().nullable(),
  createdAt: dateString.nullable(),
}).passthrough();

export const campaignsResponseSchema = z.object({
  campaigns: z.array(campaignResponseSchema),
  total: z.number(),
  hasMore: z.boolean(),
});

export const transactionCreationResponseSchema = z.object({
  id: z.string(),
  message: z.string(),
});

export const planUpgradeResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  user: userResponseSchema,
  pointsEarned: z.number(),
});

export type DashboardStatsResponse = z.infer<typeof dashboardStatsResponseSchema>;
export type DashboardActivityResponse = z.infer<typeof dashboardActivityResponseSchema>;
export type PointsExpiryResponse = z.infer<typeof pointsExpiryResponseSchema>;
export type TransactionStatsResponse = z.infer<typeof transactionStatsResponseSchema>;
export type AdminStatsResponse = z.infer<typeof adminStatsResponseSchema>;
export type CampaignsResponse = z.infer<typeof campaignsResponseSchema>;