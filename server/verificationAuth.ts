import type { Express, RequestHandler } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { authLimiter } from "./rateLimiter";
import { sendEmail, buildVerificationEmail } from "./emailService";
import { db } from "./db";
import { emailVerifications, users, transactions } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;

export function generateCode(): string {
  // 6-digit numeric code, zero-padded.
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, '0');
}

export async function issueVerificationCode(opts: {
  userId: string;
  email: string;
  phoneNumber: string;
  firstName?: string | null;
}): Promise<{ delivered: boolean; devCode?: string }> {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

  await storage.createEmailVerification({
    userId: opts.userId,
    email: opts.email,
    phoneNumber: opts.phoneNumber,
    codeHash,
    expiresAt,
  });

  const { subject, text } = buildVerificationEmail(opts.firstName || '', code);
  const result = await sendEmail({ to: opts.email, subject, text });

  // In development, return the code so the agent / tester can complete the flow
  // without configuring a mail provider. Never returned in production.
  const isDev = process.env.NODE_ENV !== 'production';
  return { delivered: result.delivered, ...(isDev && !result.delivered ? { devCode: code } : {}) };
}

export function setupVerificationAuth(app: Express) {
  // Verify the 6-digit code: confirms BOTH email and phone for the new user.
  app.post('/api/auth/verify-email', authLimiter, async (req: any, res) => {
    try {
      const sessionUserId = req.session?.user?.id;
      const { code } = req.body || {};

      if (!sessionUserId) {
        return res.status(401).json({ message: "Please sign in first." });
      }
      if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
        return res.status(400).json({ message: "Please enter the 6-digit code from your email." });
      }

      // Atomic verify + bonus award: row-lock the active verification, mark
      // verified, insert welcome bonus inside one transaction. The unique
      // index transactions(user_id, order_id) is the final guard against
      // double-bonuses if two requests race past the lock.
      const result = await db.transaction(async (tx) => {
        // Alias snake_case columns to camelCase so destructuring works regardless of the driver's casing.
        const queryResult: any = await tx.execute(sql`
          SELECT id, code_hash, attempts, expires_at, consumed
          FROM email_verifications
          WHERE user_id = ${sessionUserId} AND consumed = false
          ORDER BY created_at DESC
          LIMIT 1
          FOR UPDATE
        `);
        const rows = queryResult.rows ?? queryResult;
        const raw = rows?.[0] as Record<string, any> | undefined;
        // Neon-serverless returns columns in lower snake_case regardless of quoted aliases.
        const record = raw && {
          id: raw.id as string,
          codeHash: (raw.code_hash ?? raw.codeHash) as string,
          attempts: raw.attempts as number,
          expiresAt: (raw.expires_at ?? raw.expiresAt) as Date,
          consumed: raw.consumed as boolean,
        };

        if (!record) return { ok: false as const, status: 400, message: "No active verification code. Please request a new one." };
        if (record.attempts >= MAX_ATTEMPTS) return { ok: false as const, status: 429, message: "Too many incorrect attempts. Please request a new code." };
        if (new Date() > new Date(record.expiresAt)) return { ok: false as const, status: 400, message: "This code has expired. Please request a new one." };

        const isMatch = await bcrypt.compare(code.trim(), record.codeHash);
        if (!isMatch) {
          await tx.update(emailVerifications)
            .set({ attempts: sql`${emailVerifications.attempts} + 1` })
            .where(eq(emailVerifications.id, record.id));
          return { ok: false as const, status: 400, message: "Incorrect code. Please try again." };
        }

        await tx.update(emailVerifications)
          .set({ consumed: true })
          .where(eq(emailVerifications.id, record.id));

        const [user] = await tx.update(users)
          .set({ isVerified: true, emailVerifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, sessionUserId))
          .returning();

        // Welcome bonus — idempotent via unique (user_id, order_id) index.
        const orderId = `WELCOME-${user.id.substring(0, 8)}`;
        try {
          await tx.insert(transactions).values({
            userId: user.id,
            type: 'earning',
            description: 'Welcome to Maverick Loyalty! Sign-up bonus.',
            amount: "0.00",
            pointsEarned: 500,
            pointsSpent: 0,
            status: 'completed',
            orderId,
          });
          await tx.update(users)
            .set({ totalPoints: sql`COALESCE(${users.totalPoints}, 0) + 500` })
            .where(eq(users.id, user.id));
        } catch (e: any) {
          if (e?.code !== '23505') throw e;
          // Already awarded — silent.
        }

        return { ok: true as const };
      });

      if (!result.ok) return res.status(result.status).json({ message: result.message });

      const fresh = await storage.getUser(sessionUserId);
      req.session.user = {
        ...req.session.user,
        isVerified: true,
        totalPoints: fresh?.totalPoints ?? req.session.user.totalPoints,
      };

      return res.json({ success: true, message: "Email and phone verified. Welcome aboard!" });
    } catch (error) {
      console.error("verify-email error:", error);
      return res.status(500).json({ message: "Verification failed. Please try again." });
    }
  });

  // Request a fresh 6-digit code (e.g. lost / expired).
  app.post('/api/auth/resend-verification', authLimiter, async (req: any, res) => {
    try {
      const sessionUserId = req.session?.user?.id;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Please sign in first." });
      }

      const user = await storage.getUser(sessionUserId);
      if (!user) {
        return res.status(404).json({ message: "Account not found." });
      }
      if (user.isVerified) {
        return res.status(400).json({ message: "Your account is already verified." });
      }
      if (!user.email || !user.phoneNumber) {
        return res.status(400).json({ message: "Account is missing email or phone number." });
      }

      const result = await issueVerificationCode({
        userId: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
      });

      return res.json({
        success: true,
        message: result.delivered
          ? "A new code has been sent to your email."
          : "A new code has been generated. (Check the server logs in development.)",
        ...(result.devCode ? { devCode: result.devCode } : {}),
      });
    } catch (error) {
      console.error("resend-verification error:", error);
      return res.status(500).json({ message: "Could not send a new code. Please try again." });
    }
  });
}

/**
 * Routes that an unverified, signed-in user is still allowed to call. Anything
 * else returns 403 with code VERIFICATION_REQUIRED so the frontend can route
 * the user to the verification screen.
 */
const VERIFICATION_WHITELIST = new Set<string>([
  '/api/csrf-token',
  '/api/auth/user',
  '/api/auth/logout',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]);

export const requireVerifiedMiddleware: RequestHandler = async (req: any, res, next) => {
  if (!req.path.startsWith('/api/')) return next();
  if (VERIFICATION_WHITELIST.has(req.path)) return next();
  const sessUser = req.session?.user;
  if (!sessUser) return next(); // unauthenticated requests handled by route-level auth

  // If the session doesn't carry an explicit flag (legacy / older sessions),
  // resolve from the DB once and cache on the session so we have a canonical
  // answer regardless of which auth flow created the session.
  if (sessUser.isVerified === undefined) {
    try {
      const fresh = await storage.getUser(sessUser.id);
      sessUser.isVerified = !!fresh?.isVerified;
    } catch {
      sessUser.isVerified = false;
    }
  }

  if (sessUser.isVerified !== true) {
    return res.status(403).json({
      code: 'VERIFICATION_REQUIRED',
      message: 'Please verify your email and phone number to continue.',
    });
  }
  return next();
};
