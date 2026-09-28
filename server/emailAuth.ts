import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { authLimiter, passwordLimiter } from "./rateLimiter";
import { issueVerificationCode } from "./verificationAuth";
import { sendEmail, buildPasswordResetEmail } from "./emailService";
import type { Express, RequestHandler } from "express";

// Accepts +27XXXXXXXXX or 0XXXXXXXXX, normalises to +27 form.
function normalisePhone(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/[\s-]/g, '');
  if (/^\+27\d{9}$/.test(digits)) return digits;
  if (/^0\d{9}$/.test(digits)) return '+27' + digits.slice(1);
  return null;
}

export async function setupEmailAuth(app: Express) {
  // Email/password registration endpoint with rate limiting
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { firstName, lastName, email, password, phoneNumber, currentPlan, acceptedTerms, termsVersion } = req.body;

      if (!firstName || !lastName || !email || !password || !phoneNumber) {
        return res.status(400).json({
          message: "All fields are required: firstName, lastName, email, phoneNumber, password"
        });
      }

      if (!acceptedTerms) {
        return res.status(400).json({
          message: "You need to accept the Terms of Service and Privacy Policy to create an account."
        });
      }

      const normalisedPhone = normalisePhone(phoneNumber);
      if (!normalisedPhone) {
        return res.status(400).json({
          message: "Please enter a valid South African phone number (+27XXXXXXXXX or 0XXXXXXXXX)."
        });
      }

      // Check if user already exists by email or phone
      const existingByEmail = await storage.getUserByEmail(email);
      if (existingByEmail) {
        return res.status(400).json({
          message: "An account with this email already exists"
        });
      }
      const existingByPhone = await storage.getUserByPhone(normalisedPhone);
      if (existingByPhone) {
        return res.status(400).json({
          message: "An account with this phone number already exists"
        });
      }

      // Hash password using bcrypt (10 salt rounds for security)
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user — unverified until they confirm the emailed code.
      // Welcome bonus is deferred to /api/auth/verify-email so abandoned signups don't earn points.
      const user = await storage.createUserWithEmail({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phoneNumber: normalisedPhone,
        termsVersion: typeof termsVersion === "string" ? termsVersion : "2026-05-26",
        ...(currentPlan ? { currentPlan } : {})
      });

      // Issue & deliver the 6-digit verification code.
      const codeResult = await issueVerificationCode({
        userId: user.id,
        email: user.email!,
        phoneNumber: normalisedPhone,
        firstName: user.firstName,
      });

      // Create session in unverified state — middleware will block all
      // protected endpoints until verification completes.
      (req as any).session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        currentPlan: user.currentPlan,
        membershipTier: user.membershipTier,
        totalPoints: user.totalPoints,
        isVerified: false,
      };

      res.json({
        success: true,
        verificationRequired: true,
        message: codeResult.delivered
          ? "Account created. Check your email for the 6-digit verification code."
          : "Account created. A verification code has been generated (check server logs in development).",
        ...(codeResult.devCode ? { devCode: codeResult.devCode } : {}),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          isVerified: false,
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

      // Create session — preserve unverified state so middleware can gate access.
      (req as any).session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        currentPlan: user.currentPlan,
        membershipTier: user.membershipTier,
        totalPoints: user.totalPoints,
        isVerified: !!user.isVerified,
      };

      res.json({
        success: true,
        verificationRequired: !user.isVerified,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          currentPlan: user.currentPlan,
          membershipTier: user.membershipTier,
          totalPoints: user.totalPoints,
          isVerified: !!user.isVerified,
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

      const { subject, text } = buildPasswordResetEmail(user.firstName || '', resetUrl);
      const result = await sendEmail({ to: user.email, subject, text });

      const isDev = process.env.NODE_ENV !== "production";

      res.json({
        success: true,
        message: "If an account exists for this email, a reset link has been sent.",
        ...(isDev && !result.delivered && { resetUrl, devNote: "Development mode: reset URL returned directly. Configure an email service for production." }),
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