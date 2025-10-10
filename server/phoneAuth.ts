import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
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
    saveUninitialized: false,
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

export async function setupPhoneAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Phone number registration/login endpoint
  app.post("/api/auth/phone", async (req, res) => {
    try {
      const { phoneNumber, firstName, lastName } = req.body;
      
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
        // Create new user
        user = await storage.createUserWithPhone({
          phoneNumber: normalizedPhone,
          firstName: firstName || '',
          lastName: lastName || '',
        });

        // Award 50 bonus points for new account creation
        try {
          await storage.createTransaction({
            userId: user.id,
            type: 'earning' as const,
            description: 'Welcome bonus for new account creation',
            amount: "0.00",
            pointsEarned: 50,
            pointsSpent: 0,
            status: 'completed' as const,
            orderId: `WELCOME-${user.id.substring(0, 8)}`,
          });
          
          // Update user's total points
          user = await storage.updateUserProfile(user.id, { 
            totalPoints: (user.totalPoints || 0) + 50 
          });
        } catch (error) {
          console.error("Error awarding welcome bonus:", error);
          // Don't fail account creation if bonus fails
        }
      }

      // Create session
      (req as any).session.user = {
        id: user.id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        totalPoints: user.totalPoints,
        membershipTier: user.membershipTier,
      };

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
  app.get("/api/auth/user", (req: any, res) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
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