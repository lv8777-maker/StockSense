import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminStatsResponseSchema,
  campaignsResponseSchema,
  dashboardActivityResponseSchema,
  dashboardStatsResponseSchema,
  pointsExpiryResponseSchema,
  rewardResponseSchema,
  transactionCreationResponseSchema,
  transactionResponseSchema,
  transactionStatsResponseSchema,
  userResponseSchema,
} from "@shared/apiContracts";

const mocks = vi.hoisted(() => ({
  storage: {
    getUser: vi.fn(),
    getUserTransactions: vi.fn(),
    getUserRedemptions: vi.fn(),
    getActiveRewards: vi.fn(),
    getTransactionStats: vi.fn(),
    getUserStats: vi.fn(),
    getAllUsers: vi.fn(),
    getAllRewards: vi.fn(),
    getCampaigns: vi.fn(),
    checkAndExpirePoints: vi.fn(),
    getPointsExpiryInfo: vi.fn(),
  },
  recordTransaction: vi.fn(),
}));

vi.mock("./storage", () => ({ storage: mocks.storage }));
vi.mock("./phoneAuth", () => ({
  setupPhoneAuth: vi.fn(),
  isAuthenticated: (req: any, _res: any, next: () => void) => {
    req.user = { claims: { sub: "user-1" } };
    next();
  },
}));
vi.mock("./emailAuth", () => ({
  setupEmailAuth: vi.fn(),
  isEmailAuthenticated: vi.fn(),
}));
vi.mock("./verificationAuth", () => ({
  setupVerificationAuth: vi.fn(),
  requireVerifiedMiddleware: (_req: any, _res: any, next: () => void) => next(),
}));
vi.mock("./rateLimiter", () => ({
  uploadLimiter: (_req: any, _res: any, next: () => void) => next(),
}));
vi.mock("./services/PointsEngineService", () => ({
  pointsEngineService: { recordTransaction: mocks.recordTransaction },
}));
vi.mock("./services/CampaignService", () => ({
  campaignService: {},
}));
vi.mock("./adminRoutes", async () => {
  const { Router } = await import("express");
  return { adminRouter: Router() };
});
vi.mock("./middleware/rbac", () => ({
  loadAdminContext: (_req: any, _res: any, next: () => void) => next(),
}));
vi.mock("./receiptProcessor", () => ({
  processReceiptImage: vi.fn(),
  isValidReceiptFile: vi.fn(() => true),
}));
vi.mock("./invoiceProcessor", () => ({
  extractAndParseInvoice: vi.fn(),
  namesMatch: vi.fn(),
  findPackage: vi.fn(),
  isValidInvoiceFile: vi.fn(() => true),
}));

import { registerRoutes } from "./routes";

const now = new Date("2026-08-27T09:00:00.000Z");
const user = {
  id: "user-1",
  email: "member@example.com",
  firstName: "Maya",
  lastName: "Member",
  currentPlan: "Core",
  membershipTier: "bronze",
  totalPoints: null,
};
const transaction = {
  id: "tx-1",
  userId: "user-1",
  type: "purchase",
  amount: "125.00",
  pointsEarned: null,
  pointsSpent: null,
  description: "Data bundle",
  orderId: "order-1",
  status: "completed",
  createdAt: now,
};
const reward = {
  id: "reward-1",
  name: "Coffee",
  description: null,
  pointsCost: 100,
  category: "food",
  imageUrl: null,
  isActive: true,
  redemptionCount: 0,
  maxRedemptions: null,
  validUntil: null,
  createdAt: now,
  updatedAt: now,
};

async function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { user: { id: "user-1" } };
    next();
  });
  app.locals.csrfProtection = (_req: any, _res: any, next: () => void) => next();
  app.locals.generateCsrfToken = () => "test-token";
  await registerRoutes(app);
  return app;
}

describe("screen-facing API contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storage.getUser.mockResolvedValue(user);
    mocks.storage.getUserTransactions.mockResolvedValue([transaction]);
    mocks.storage.getUserRedemptions.mockResolvedValue([]);
    mocks.storage.getActiveRewards.mockResolvedValue([reward]);
    mocks.storage.getTransactionStats.mockResolvedValue({
      totalPurchases: 1,
      totalSpent: "125.00",
      totalPointsEarned: 0,
    });
    mocks.storage.getUserStats.mockResolvedValue({
      totalCustomers: 1,
      activeRewards: 1,
      totalPointsRedeemed: 0,
      monthlyRevenue: "125.00",
    });
    mocks.storage.getAllUsers.mockResolvedValue([user]);
    mocks.storage.getAllRewards.mockResolvedValue([reward]);
    mocks.storage.getCampaigns.mockResolvedValue({
      campaigns: [{
        id: "campaign-1",
        name: "Double points",
        description: null,
        type: "points_multiplier",
        status: "active",
        startDate: now,
        endDate: null,
        currentParticipants: 0,
        maxParticipants: null,
        rules: {},
        targetAudience: {},
        createdAt: now,
      }],
      total: 1,
      hasMore: false,
    });
    mocks.storage.getPointsExpiryInfo.mockResolvedValue({
      expiryDate: null,
      daysRemaining: null,
      isExpired: false,
      pointsAtRisk: 0,
    });
    mocks.recordTransaction.mockResolvedValue("tx-created");
  });

  it("validates dashboard stats and normalizes a nullable balance", async () => {
    const response = await request(await createApp()).get("/api/dashboard/stats");

    expect(response.status).toBe(200);
    expect(dashboardStatsResponseSchema.parse(response.body).totalPoints).toBe(0);
  });

  it("validates dashboard activity and points expiry responses", async () => {
    const app = await createApp();
    const [activity, expiry] = await Promise.all([
      request(app).get("/api/dashboard/activity"),
      request(app).get("/api/points/expiry"),
    ]);

    expect(dashboardActivityResponseSchema.parse(activity.body)).toHaveLength(1);
    expect(pointsExpiryResponseSchema.parse(expiry.body).daysRemaining).toBeNull();
  });

  it("validates rewards, history, and admin reporting responses", async () => {
    const app = await createApp();
    const [rewards, transactions, stats, adminStats, users, adminRewards] = await Promise.all([
      request(app).get("/api/rewards"),
      request(app).get("/api/transactions"),
      request(app).get("/api/transactions/stats"),
      request(app).get("/api/admin/stats"),
      request(app).get("/api/admin/users"),
      request(app).get("/api/admin/rewards"),
    ]);

    expect(rewardResponseSchema.array().parse(rewards.body)).toHaveLength(1);
    expect(transactionResponseSchema.array().parse(transactions.body)).toHaveLength(1);
    expect(transactionStatsResponseSchema.parse(stats.body).totalPurchases).toBe(1);
    expect(adminStatsResponseSchema.parse(adminStats.body).totalCustomers).toBe(1);
    expect(userResponseSchema.array().parse(users.body)[0].totalPoints).toBeNull();
    expect(rewardResponseSchema.array().parse(adminRewards.body)).toHaveLength(1);
  });

  it("validates campaigns and parses transaction creation success", async () => {
    const app = await createApp();
    const campaigns = await request(app).get("/api/campaigns");
    const creation = await request(app).post("/api/transactions").send({
      type: "purchase",
      amount: 125,
      description: "Data bundle",
      category: "data",
      orderId: "order-2",
    });

    expect(campaignsResponseSchema.parse(campaigns.body).total).toBe(1);
    expect(transactionCreationResponseSchema.parse(creation.body)).toEqual({
      id: "tx-created",
      message: "Transaction processed successfully",
    });
  });
});