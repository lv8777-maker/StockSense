import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import type { Express, RequestHandler } from "express";

export async function setupEmailAuth(app: Express) {
  // Email/password registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { firstName, lastName, email, password, currentPlan } = req.body;
      
      if (!firstName || !lastName || !email || !password || !currentPlan) {
        return res.status(400).json({ 
          message: "All fields are required: firstName, lastName, email, password, currentPlan" 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          message: "An account with this email already exists" 
        });
      }

      // Create new user
      const user = await storage.createUserWithEmail({
        firstName,
        lastName,
        email,
        password, // In production, hash this password
        currentPlan
      });

      // Create session
      (req as any).session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        currentPlan: user.currentPlan,
        membershipTier: user.membershipTier,
        totalPoints: user.totalPoints,
      };

      // Create welcome transaction for plan selection
      await storage.createTransaction({
        userId: user.id,
        type: 'earning',
        description: `Welcome to Maverick Loyalty! Plan selection bonus for ${currentPlan}`,
        amount: "0.00",
        pointsEarned: user.totalPoints || 0,
        pointsSpent: 0,
        status: 'completed',
        orderId: `WELCOME-${user.id.substring(0, 8)}`,
      });

      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          currentPlan: user.currentPlan,
          membershipTier: user.membershipTier,
          totalPoints: user.totalPoints,
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Account creation failed" });
    }
  });

  // Email/password login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Validate user credentials
      const user = await storage.validateUserPassword(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create session
      (req as any).session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        currentPlan: user.currentPlan,
        membershipTier: user.membershipTier,
        totalPoints: user.totalPoints,
      };

      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          currentPlan: user.currentPlan,
          membershipTier: user.membershipTier,
          totalPoints: user.totalPoints,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Plan upgrade endpoint
  app.post("/api/auth/upgrade-plan", async (req, res) => {
    try {
      const { newPlan } = req.body;
      const session = (req as any).session;
      
      if (!session?.user?.id) {
        return res.status(401).json({ message: "Please log in to upgrade your plan" });
      }

      if (!newPlan) {
        return res.status(400).json({ message: "New plan is required" });
      }

      // Perform the upgrade
      const result = await storage.upgradePlan(session.user.id, newPlan);

      // Update session
      session.user.currentPlan = result.user.currentPlan;
      session.user.membershipTier = result.user.membershipTier;
      session.user.totalPoints = result.user.totalPoints;

      res.json({ 
        success: true,
        message: `Your plan has been upgraded. You earned +${result.pointsEarned} points! Total points: ${result.user.totalPoints}`,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          currentPlan: result.user.currentPlan,
          membershipTier: result.user.membershipTier,
          totalPoints: result.user.totalPoints,
        },
        pointsEarned: result.pointsEarned
      });
    } catch (error) {
      console.error("Plan upgrade error:", error);
      res.status(500).json({ message: "Plan upgrade failed" });
    }
  });
}

export const isEmailAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Attach user to request for easy access
  req.user = { 
    claims: { sub: req.session.user.id },
    ...req.session.user 
  };
  
  next();
};