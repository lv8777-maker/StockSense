import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
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

      // Check if user exists or create new user
      let user = await storage.getUserByPhone(normalizedPhone);
      
      if (!user) {
        // Create new user with plan selection (starts with 0 points)
        user = await storage.createUserWithPhone({
          phoneNumber: normalizedPhone,
          firstName: firstName || '',
          lastName: lastName || '',
          currentPlan: currentPlan,
        });

        // Award welcome bonus via transaction if plan is selected
        if (currentPlan) {
          const welcomePoints = planPointsMapping[currentPlan] || 0;
          if (welcomePoints > 0) {
            try {
              await storage.createTransaction({
                userId: user.id,
                type: 'earning' as const,
                description: `Welcome to Maverick Loyalty! Plan selection bonus for ${currentPlan}`,
                amount: "0.00",
                pointsEarned: welcomePoints,
                pointsSpent: 0,
                status: 'completed' as const,
                orderId: `WELCOME-${user.id.substring(0, 8)}`,
              });
              
              // Fetch updated user to get correct points after transaction
              user = (await storage.getUserByPhone(normalizedPhone))!;
            } catch (error) {
              console.error("Error creating welcome transaction:", error);
              // Don't fail account creation if transaction creation fails
            }
          }
        }
      }

      // Create session
      (req as any).session.user = {
        id: user.id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        currentPlan: user.currentPlan,
        totalPoints: user.totalPoints,
        membershipTier: user.membershipTier,
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