import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { planUpgradeResponseSchema } from "@shared/apiContracts";

const mocks = vi.hoisted(() => ({
  upgradePlan: vi.fn(),
}));

vi.mock("./storage", () => ({
  storage: { upgradePlan: mocks.upgradePlan },
}));
vi.mock("./rateLimiter", () => ({
  authLimiter: (_req: any, _res: any, next: () => void) => next(),
  passwordLimiter: (_req: any, _res: any, next: () => void) => next(),
}));
vi.mock("./verificationAuth", () => ({
  issueVerificationCode: vi.fn(),
}));

import { setupEmailAuth } from "./emailAuth";

describe("plan upgrade contract", () => {
  it("parses the successful upgrade response", async () => {
    mocks.upgradePlan.mockResolvedValue({
      user: {
        id: "user-1",
        email: "member@example.com",
        firstName: "Maya",
        lastName: "Member",
        currentPlan: "Plus",
        membershipTier: "silver",
        totalPoints: 250,
      },
      pointsEarned: 250,
    });

    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.session = {
        user: {
          id: "user-1",
          currentPlan: "Core",
          membershipTier: "bronze",
          totalPoints: null,
        },
      };
      next();
    });
    await setupEmailAuth(app);

    const response = await request(app)
      .post("/api/auth/upgrade-plan")
      .send({ newPlan: "Plus" });

    expect(response.status).toBe(200);
    expect(planUpgradeResponseSchema.parse(response.body)).toMatchObject({
      success: true,
      pointsEarned: 250,
      user: { currentPlan: "Plus", totalPoints: 250 },
    });
  });
});