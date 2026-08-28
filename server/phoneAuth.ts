import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { completeDevelopmentVerification } from "./verificationAuth";
import { authLimiter } from "./rateLimiter";
import type { Express, RequestHandler } from "express";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'maverick-loyalty-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: true, // Create sessions for unauthenticated users (required for CSRF)
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

// Phone number validation for South African format
export function validateSouthAfricanPhoneNumber(phoneNumber: string): boolean {
  // South African mobile formats: +27 6X XXX XXXX, +27 7X XXX XXXX, +27 8X XXX XXXX
  const saRegex = /^\+27[678][0-9]{8}$/;
  return saRegex.test(phoneNumber);
}

// Normalize phone number to South African international format
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle different South African input formats
  if (cleaned.startsWith('27')) {
    // Already has country code +27
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    // Local format starting with 0 (e.g., 072 123 4567)
    return '+27' + cleaned.substring(1);
  } else if (cleaned.length === 9 && /^[678]/.test(cleaned)) {
    // 9-digit mobile number without leading 0
    return '+27' + cleaned;
  }
  
  return '+' + cleaned;
}

export function resolveSessionVerification(
  sessionVerified: boolean | undefined,
  persistedVerified: boolean | null | undefined,
): boolean {
  return sessionVerified === true || persistedVerified === true;
}

export async function setupPhoneAuth(app: Express) {
  // Session is now initialized in server/index.ts
  
  // Phone number registration/login endpoint with rate limiting
  app.post("/api/auth/phone", authLimiter, async (req, res) => {
    try {
      const { phoneNumber, firstName, lastName, currentPlan } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      
      if (!validateSouthAfricanPhoneNumber(normalizedPhone)) {
        return res.status(400).json({ 
          message: "Please enter a valid South African mobile number (e.g., 072 123 4567 or +27 72 123 4567)" 
        });
      }

      // Check if user exists or create new user
      let user = await storage.getUserByPhone(normalizedPhone);
      
      if (!user) {
        // Create new user - always starts as Maverick Starter regardless of plan
        user = await storage.createUserWithPhone({
          phoneNumber: normalizedPhone,
          firstName: firstName || '',
          lastName: lastName || '',
          currentPlan: currentPlan,
        });

        // Award flat 500-point welcome bonus to all new members
        try {
          await storage.createTransaction({
            userId: user.id,
            type: 'earning' as const,
            description: 'Welcome to Maverick Loyalty! Sign-up bonus.',
            amount: "0.00",
            pointsEarned: 500,
            pointsSpent: 0,
            status: 'completed' as const,
            orderId: `WELCOME-${user.id.substring(0, 8)}`,
          });
          
          // Fetch updated user to get correct points after transaction
          user = (await storage.getUserByPhone(normalizedPhone))!;
        } catch (error) {
          console.error("Error creating welcome transaction:", error);
        }
      }

      // Create session — phone-auth users are implicitly verified (number is the
      // login factor itself), so we mark isVerified true so the verification
      // gate doesn't block them.
      (req as any).session.user = {
        id: user.id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        currentPlan: user.currentPlan,
        totalPoints: user.totalPoints,
        membershipTier: user.membershipTier,
        isVerified: true,
      };

      // Explicitly save session before responding
      await new Promise<void>((resolve, reject) => {
        (req as any).session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ 
        success: true, 
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          totalPoints: user.totalPoints,
          membershipTier: user.membershipTier,
        }
      });
    } catch (error) {
      console.error("Phone auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/user", async (req: any, res) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let currentUser = await storage.getUser(req.session.user.id);
    if (process.env.NODE_ENV !== "production" && req.session.user.isVerified !== true) {
      const verifiedUser = await completeDevelopmentVerification(req.session.user.id);
      if (verifiedUser) {
        currentUser = verifiedUser;
      }
    }

    if (!currentUser) {
      return res.status(404).json({ message: "User account not found" });
    }

    req.session.user = {
      ...req.session.user,
      email: currentUser.email,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      phoneNumber: currentUser.phoneNumber,
      currentPlan: currentUser.currentPlan,
      membershipTier: currentUser.membershipTier,
      totalPoints: currentUser.totalPoints,
      isVerified: resolveSessionVerification(
        req.session.user.isVerified,
        currentUser.isVerified,
      ),
    };

    res.json(req.session.user);
  });

}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
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