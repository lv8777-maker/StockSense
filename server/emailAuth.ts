import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { authLimiter, passwordLimiter } from "./rateLimiter";
import type { Express, RequestHandler } from "express";

export async function setupEmailAuth(app: Express) {
  // Email/password registration endpoint with rate limiting
  app.post("/api/auth/register", authLimiter, async (req, res) => {
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

      // Hash password using bcrypt (10 salt rounds for security)
      const hashedPassword = await bcrypt.hash(password, 10);

      // Plan to points mapping for welcome bonus
      const planPointsMapping: Record<string, number> = {
        'Essential': 100,
        'Core': 100,
        'Plus': 200,
        'Prime': 200,
        'Deluxe': 300,
        'Elite': 300,
        'Bronze': 500,
        'Silver': 500,
        'Gold': 500,
        'Platinum': 500,
      };
      
      const welcomePoints = planPointsMapping[currentPlan] || 100;

      // Create new user with hashed password (starts with 0 points)
      const user = await storage.createUserWithEmail({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        currentPlan
      });

      // Award welcome bonus via transaction (this will update user's totalPoints)
      await storage.createTransaction({
        userId: user.id,
        type: 'earning',
        description: `Welcome to Maverick Loyalty! Plan selection bonus for ${currentPlan}`,
        amount: "0.00",
        pointsEarned: welcomePoints,
        pointsSpent: 0,
        status: 'completed',
        orderId: `WELCOME-${user.id.substring(0, 8)}`,
      });

      // Fetch updated user to get correct totalPoints after transaction
      const updatedUser = await storage.getUserByEmail(email);

      // Create session with updated points
      (req as any).session.user = {
        id: updatedUser!.id,
        email: updatedUser!.email,
        firstName: updatedUser!.firstName,
        lastName: updatedUser!.lastName,
        currentPlan: updatedUser!.currentPlan,
        membershipTier: updatedUser!.membershipTier,
        totalPoints: updatedUser!.totalPoints,
      };

      res.json({ 
        success: true, 
        user: {
          id: updatedUser!.id,
          email: updatedUser!.email,
          firstName: updatedUser!.firstName,
          lastName: updatedUser!.lastName,
          currentPlan: updatedUser!.currentPlan,
          membershipTier: updatedUser!.membershipTier,
          totalPoints: updatedUser!.totalPoints,
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Account creation failed" });
    }
  });

  // Email/password login endpoint with stricter rate limiting
  app.post("/api/auth/login", passwordLimiter, async (req, res) => {
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

  // Logout endpoint for email auth users
  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
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