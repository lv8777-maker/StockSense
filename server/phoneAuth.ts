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

// Phone number validation for MTN Uganda format
export function validateMTNPhoneNumber(phoneNumber: string): boolean {
  // MTN Uganda formats: +256 77X XXX XXX or +256 78X XXX XXX
  const mtnRegex = /^\+256(77[0-9]|78[0-9])[0-9]{6}$/;
  return mtnRegex.test(phoneNumber);
}

// Normalize phone number to international format
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle different input formats
  if (cleaned.startsWith('256')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('077') || cleaned.startsWith('078')) {
    return '+256' + cleaned;
  } else if (cleaned.startsWith('77') || cleaned.startsWith('78')) {
    return '+256' + cleaned;
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
      
      if (!validateMTNPhoneNumber(normalizedPhone)) {
        return res.status(400).json({ 
          message: "Please enter a valid MTN Uganda phone number (077XXXXXXX or 078XXXXXXX)" 
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
      }

      // Create session
      (req as any).session.user = {
        id: user.id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
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

  // Logout endpoint
  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
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