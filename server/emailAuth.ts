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
      
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ 
          message: "All fields are required: firstName, lastName, email, password" 
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

      // Create new user - always starts as Maverick Starter regardless of plan
      const user = await storage.createUserWithEmail({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        ...(currentPlan ? { currentPlan } : {})
      });

      // Award flat 500-point welcome bonus to all new members
      await storage.createTransaction({
        userId: user.id,
        type: 'earning',
        description: 'Welcome to Maverick Loyalty! Sign-up bonus.',
        amount: "0.00",
        pointsEarned: 500,
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

  // Forgot password — generates reset token (1 hour expiry)
  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email.toLowerCase().trim());

      // Always return success to prevent email enumeration
      if (!user || !user.password) {
        return res.json({
          success: true,
          message: "If an account exists for this email, a reset link has been sent.",
        });
      }

      const token = await storage.createPasswordResetToken(user.id);

      const baseUrl = process.env.NODE_ENV === "production"
        ? `https://${req.headers.host}`
        : `${req.protocol}://${req.headers.host}`;
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      // In production, send via email service. For now, include link in response for development.
      const isDev = process.env.NODE_ENV !== "production";

      console.log(`[Password Reset] Reset link for ${email}: ${resetUrl}`);

      res.json({
        success: true,
        message: "If an account exists for this email, a reset link has been sent.",
        ...(isDev && { resetUrl, devNote: "Development mode: reset URL returned directly. Configure an email service for production." }),
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password — validates token and sets new password
  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const resetRecord = await storage.getPasswordResetToken(token);

      if (!resetRecord) {
        return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
      }

      if (resetRecord.used) {
        return res.status(400).json({ message: "This reset link has already been used. Please request a new one." });
      }

      if (new Date() > new Date(resetRecord.expiresAt)) {
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUserPassword(resetRecord.userId, hashedPassword);
      await storage.markPasswordResetTokenUsed(token);

      res.json({ success: true, message: "Your password has been reset successfully. You can now sign in." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
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