import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage, RedemptionOperationError } from "./storage";
import { setupPhoneAuth, isAuthenticated } from "./phoneAuth";
import { setupEmailAuth, isEmailAuthenticated } from "./emailAuth";
import { setupVerificationAuth, requireVerifiedMiddleware } from "./verificationAuth";
import { uploadLimiter } from "./rateLimiter";
import { campaignService } from "./services/CampaignService";
import { pointsEngineService } from "./services/PointsEngineService";
import { adminRouter } from "./adminRoutes";
import { loadAdminContext } from "./middleware/rbac";
import { 
  insertRewardSchema, 
  insertTransactionSchema, 
  insertCampaignSchema,
  insertEarningRuleSchema 
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";
import { processReceiptImage, isValidReceiptFile } from "./receiptProcessor";
import {
  extractAndParseInvoice,
  namesMatch,
  findPackage,
  isValidInvoiceFile,
} from "./invoiceProcessor";
import { findNewlyQualifiedRewards } from "./rewardQualification";
import {
  createReceiptDocumentFingerprint,
  createReceiptFingerprint,
  isReceiptDuplicateError,
} from "./receiptFingerprint";

export async function registerRoutes(app: Express): Promise<Server> {
  // Block unverified users from anything beyond auth/verification endpoints.
  // Mounted FIRST so it runs before any route handler registered below — including
  // the auth setup functions that themselves register endpoints.
  app.use(requireVerifiedMiddleware);

  // Auth middleware
  await setupPhoneAuth(app);
  await setupEmailAuth(app);
  setupVerificationAuth(app);
  
  // Combined auth middleware - accepts both phone and email auth
  // Since both auth methods use the same session structure, we can use a single check
  const combinedAuth: typeof isAuthenticated = async (req: any, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Attach user to request with normalized structure
    req.user = { 
      claims: { sub: req.session.user.id },
      ...req.session.user 
    };
    
    next();
  };

  // Get CSRF protection middleware from app.locals
  const csrfProtection = (app as any).locals.csrfProtection;

  // CSRF token endpoint - must be accessible without auth (no CSRF protection)
  app.get('/api/csrf-token', (req, res) => {
    try {
      const token = (app as any).locals.generateCsrfToken(req, res);
      res.json({ csrfToken: token });
    } catch (error) {
      console.error("Error generating CSRF token:", error);
      res.status(500).json({ message: "Failed to generate CSRF token" });
    }
  });

  // Configure multer for receipt uploads
  const uploadsDir = path.join(process.cwd(), 'uploads', 'receipts');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
      if (isValidReceiptFile(file.mimetype, file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and WebP files are allowed.'));
      }
    }
  });

  // Auth routes
  app.get('/api/auth/user', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/logout', async (req: any, res) => {
    try {
      req.logout((err: any) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ message: "Failed to logout" });
        }
        req.session.destroy((err: any) => {
          if (err) {
            console.error("Session destroy error:", err);
            return res.status(500).json({ message: "Failed to destroy session" });
          }
          res.clearCookie('connect.sid');
          res.json({ message: "Logged out successfully" });
        });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // User profile routes
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = req.body;
      
      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updates.id;
      delete updates.totalPoints;
      delete updates.createdAt;
      delete updates.updatedAt;
      
      // Convert date fields to proper Date objects or null
      if (updates.dateOfBirth !== undefined) {
        updates.dateOfBirth = updates.dateOfBirth && updates.dateOfBirth.trim() !== '' 
          ? new Date(updates.dateOfBirth) 
          : null;
      }
      
      const user = await storage.updateUserProfile(userId, updates);
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Phone number deregistration route
  app.delete('/api/user/phone', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get current user to check if they have a phone number
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!currentUser.phoneNumber) {
        return res.status(400).json({ message: "No phone number registered to deregister" });
      }

      // Deregister the phone number
      const updatedUser = await storage.deregisterPhoneNumber(userId);
      
      res.json({ 
        message: "Phone number deregistered successfully",
        user: {
          ...updatedUser,
          password: undefined // Don't return password in response
        }
      });
    } catch (error) {
      console.error("Error deregistering phone number:", error);
      res.status(500).json({ message: "Failed to deregister phone number" });
    }
  });

  // Rewards routes
  // GET route - available to all authenticated users to view rewards
  app.get('/api/rewards', isAuthenticated, async (req, res) => {
    try {
      const rewards = await storage.getActiveRewards();
      res.json(rewards);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      res.status(500).json({ message: "Failed to fetch rewards" });
    }
  });

  // Note: POST, PATCH, DELETE routes for rewards are now protected in /api/admin/rewards
  // Only admins can create, update, or delete rewards through the admin API

  // Transaction routes
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getUserTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get('/api/transactions/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getTransactionStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching transaction stats:", error);
      res.status(500).json({ message: "Failed to fetch transaction stats" });
    }
  });

  app.post('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type, amount, description, category, orderId } = req.body;
      
      // Use points engine for transaction processing
      const transactionId = await pointsEngineService.recordTransaction(userId, {
        type,
        amount: parseFloat(amount?.toString() || '0'),
        description,
        orderId,
        category,
      });
      
      res.json({ id: transactionId, message: "Transaction processed successfully" });
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Configure multer for invoice (PDF) uploads
  const invoicesDir = path.join(process.cwd(), 'uploads', 'invoices');
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }
  const invoiceUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, invoicesDir),
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'invoice-' + uniqueSuffix + path.extname(file.originalname));
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (isValidInvoiceFile(file.mimetype, file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error('Please upload a PDF file.'));
      }
    },
  });

  // Wrap multer so file-type / size errors return a clean 400 JSON instead of a 500.
  const handleInvoiceUpload = (req: any, res: any, next: any) => {
    invoiceUpload.single('invoice')(req, res, (err: any) => {
      if (err) {
        const message = err?.message === 'Please upload a PDF file.'
          ? 'Please upload a PDF file.'
          : (err?.code === 'LIMIT_FILE_SIZE'
              ? 'File too large. Maximum size is 10MB.'
              : 'Could not read invoice. Please ensure you are uploading a valid MTN Tax Invoice.');
        return res.status(400).json({ message });
      }
      next();
    });
  };

  // Invoice upload route — parses an MTN Tax Invoice PDF and awards package points
  app.post('/api/invoices/upload', uploadLimiter, combinedAuth, handleInvoiceUpload, async (req: any, res) => {
    const cleanup = (filePath?: string) => {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {});
      }
    };

    try {
      const userId = req.user?.claims?.sub || req.session?.user?.id;
      if (!userId) {
        cleanup(req.file?.path);
        return res.status(401).json({ message: "Not authenticated" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Please upload a PDF file." });
      }

      const filePath = req.file.path;
      const user = await storage.getUser(userId);
      if (!user) {
        cleanup(filePath);
        return res.status(404).json({ message: "User account not found." });
      }

      // 1. Extract & parse invoice (pdf-parse first, OCR fallback for scanned PDFs)
      let parsed;
      const buffer = fs.readFileSync(filePath);
      try {
        const result = await extractAndParseInvoice(buffer);
        parsed = result.parsed;
      } catch (err) {
        console.error('PDF extraction failed:', err);
      }

      // Development-only fallback for sample PDFs used to demonstrate the
      // complete upload and points-award journey. A content hash gives each
      // test file a stable invoice number, so duplicate protection still works.
      if (!parsed && process.env.NODE_ENV !== "production") {
        const testInvoiceId = createHash("sha256")
          .update(buffer)
          .digest("hex")
          .slice(0, 12)
          .toUpperCase();
        parsed = {
          invoiceNumber: `TEST-${testInvoiceId}`,
          invoiceDate: new Date().toISOString().slice(0, 10),
          customerName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          accountNumber: `TEST-${user.id.substring(0, 8)}`,
          msisdn: user.phoneNumber,
          packageName: "MTN Mobile Internet 2GB",
          tariff: "24 MTH TEST",
          activationDate: new Date().toISOString().slice(0, 10),
          contractDuration: "24 Months",
        };
      }

      if (!parsed) {
        cleanup(filePath);
        return res.status(400).json({
          message: "Could not read invoice. Please ensure you are uploading a valid MTN Tax Invoice."
        });
      }

      // 2. Duplicate-invoice safeguard (across ALL users)
      const existing = await storage.getInvoiceByNumber(parsed.invoiceNumber);
      if (existing) {
        cleanup(filePath);
        return res.status(409).json({
          message: "This invoice has already been used to claim points and cannot be submitted again."
        });
      }

      // 3. Customer name verification
      if (!namesMatch(parsed.customerName, user.firstName, user.lastName)) {
        cleanup(filePath);
        return res.status(403).json({
          message: "The name on this invoice does not match your account. Please contact support if you believe this is an error."
        });
      }

      // 4. Contract duration must be recognised (24 or 36 months)
      if (!parsed.contractDuration) {
        cleanup(filePath);
        return res.status(400).json({
          message: "This package is not eligible for points. Please contact support."
        });
      }

      // 5. Package lookup
      const pkg = await findPackage(parsed.packageName, parsed.contractDuration);
      if (!pkg) {
        cleanup(filePath);
        return res.status(400).json({
          message: "This package is not eligible for points. Please contact support."
        });
      }

      // 6. Consume the unique invoice number, log the award, and update points in
      //    one transaction. A failure rolls everything back, making retries safe.
      let award;
      try {
        award = await storage.awardInvoicePoints(
          {
            invoiceNumber: parsed.invoiceNumber,
            userId,
            packageName: pkg.name,
            contractDuration: parsed.contractDuration,
            pointsAwarded: pkg.pointsAwarded,
          },
          {
            type: 'invoice_upload',
            description: `Points claimed for MTN ${pkg.name} (${parsed.contractDuration.toLowerCase()}) — Invoice ${parsed.invoiceNumber}`,
            amount: '0.00',
            pointsEarned: pkg.pointsAwarded,
            pointsSpent: 0,
            status: 'completed',
            orderId: parsed.invoiceNumber,
          },
        );
      } catch (err: any) {
        if (isInvoiceNumberConflict(err)) {
          cleanup(filePath);
          return res.status(409).json({
            message: "This invoice has already been used to claim points and cannot be submitted again."
          });
        }
        console.error('Atomic invoice award failed:', err);
        cleanup(filePath);
        return res.status(503).json({
          message: "We couldn't credit your points. Your invoice was not used, so please try again."
        });
      }

      const pointsBeforeAward = user.totalPoints ?? 0;
      const pointsAfterAward = award.user.totalPoints ?? pointsBeforeAward + pkg.pointsAwarded;
      let newlyQualifiedRewards: ReturnType<typeof findNewlyQualifiedRewards> = [];
      try {
        const activeRewards = await storage.getActiveRewards();
        newlyQualifiedRewards = findNewlyQualifiedRewards(
          activeRewards,
          pointsBeforeAward,
          pointsAfterAward,
        );
      } catch (error) {
        // Reward notifications are optional response decoration. The invoice
        // award has committed successfully and must still be reported as such.
        console.error("Failed to calculate newly qualified rewards:", error);
      }

      cleanup(filePath);
      return res.json({
        success: true,
        message: `🎉 You've earned ${pkg.pointsAwarded} points for your MTN ${pkg.name} contract!`,
        pointsAwarded: pkg.pointsAwarded,
        packageName: pkg.name,
        contractDuration: parsed.contractDuration,
        invoiceNumber: parsed.invoiceNumber,
        submissionId: award.submission.id,
        newlyQualifiedRewards,
      });
    } catch (error: any) {
      console.error('Invoice upload error:', error);
      cleanup(req.file?.path);
      // Surface duplicate-key races gracefully
      if (isInvoiceNumberConflict(error)) {
        return res.status(409).json({
          message: "This invoice has already been used to claim points and cannot be submitted again."
        });
      }
      return res.status(503).json({
        message: "We couldn't credit your points. Your invoice was not used, so please try again."
      });
    }
  });

  app.get('/api/invoices', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.user?.id;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const submissions = await storage.getUserInvoiceSubmissions(userId);
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching invoice submissions:', error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Receipt upload routes with rate limiting to prevent OCR abuse
  app.post('/api/receipts/upload', uploadLimiter, combinedAuth, upload.single('receipt'), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No receipt file uploaded" });
      }

      const filePath = req.file.path;
      const fileName = req.file.filename;
      const fileUrl = `/uploads/receipts/${fileName}`;
      const fileHash = createReceiptFingerprint(
        await fs.promises.readFile(filePath),
      );

      const existingReceipt = await storage.getReceiptUploadByHash(userId, fileHash);
      if (existingReceipt) {
        await fs.promises.unlink(filePath).catch(() => {});
        return res.status(409).json({
          success: false,
          duplicate: true,
          message: "This receipt has already been uploaded. No points were awarded.",
          receipt: existingReceipt,
        });
      }

      // Create initial receipt upload record
      let receiptUpload;
      try {
        receiptUpload = await storage.createReceiptUpload({
          userId,
          fileName,
          fileUrl,
          fileHash,
          status: 'processing',
        });
      } catch (error: any) {
        if (isReceiptDuplicateError(error)) {
          await fs.promises.unlink(filePath).catch(() => {});
          return res.status(409).json({
            success: false,
            duplicate: true,
            message: "This receipt has already been uploaded. No points were awarded.",
          });
        }
        throw error;
      }

      // Process receipt with OCR in background
      try {
        const processed = await processReceiptImage(filePath, req.file.mimetype);
        const documentHash = createReceiptDocumentFingerprint(processed.ocrText);

        try {
          await storage.updateReceiptUpload(receiptUpload.id, { documentHash });
        } catch (error) {
          if (isReceiptDuplicateError(error)) {
            await storage.deleteReceiptUpload(receiptUpload.id);
            await fs.promises.unlink(filePath).catch(() => {});
            return res.status(409).json({
              success: false,
              duplicate: true,
              message: "This receipt has already been uploaded. No points were awarded.",
            });
          }
          throw error;
        }

        const receiptUpdates = {
          ocrText: processed.ocrText,
          purchaseType: processed.purchaseType,
          detectedAmount: processed.detectedAmount?.toString(),
          detectedPlan: processed.detectedPlan,
          pointsAwarded: processed.pointsAwarded,
          status: 'completed',
        };

        let updatedReceipt;
        if (processed.pointsAwarded > 0) {
          ({ receipt: updatedReceipt } = await storage.awardReceiptPoints(
            {
              userId,
              type: 'earning',
              description: processed.description,
              amount: processed.detectedAmount?.toString() || '0.00',
              pointsEarned: processed.pointsAwarded,
              pointsSpent: 0,
              status: 'completed',
              orderId: `RCP-${receiptUpload.id.substring(0, 8)}`,
            },
            receiptUpload.id,
            receiptUpdates,
          ));
        } else {
          updatedReceipt = await storage.updateReceiptUpload(
            receiptUpload.id,
            receiptUpdates,
          );
        }

        res.json({
          success: true,
          receipt: updatedReceipt,
          processed: {
            purchaseType: processed.purchaseType,
            detectedAmount: processed.detectedAmount,
            detectedPlan: processed.detectedPlan,
            pointsAwarded: processed.pointsAwarded,
            description: processed.description,
          }
        });

      } catch (ocrError) {
        // Update receipt with error status
        await storage.updateReceiptUpload(receiptUpload.id, {
          status: 'failed',
          processingError: ocrError instanceof Error ? ocrError.message : 'OCR processing failed',
        });

        res.status(500).json({
          success: false,
          message: "Failed to process receipt",
          error: ocrError instanceof Error ? ocrError.message : 'Unknown error'
        });
      }

    } catch (error) {
      console.error("Error uploading receipt:", error);
      res.status(500).json({ message: "Failed to upload receipt" });
    }
  });

  app.get('/api/receipts', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session?.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const receipts = await storage.getUserReceiptUploads(userId);
      res.json(receipts);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      res.status(500).json({ message: "Failed to fetch receipts" });
    }
  });

  // Dashboard statistics endpoint
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const transactions = await storage.getUserTransactions(userId);
      const redemptions = await storage.getUserRedemptions(userId);
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const monthlyTransactions = transactions.filter(t => 
        new Date(t.createdAt!) >= startOfMonth && (t.pointsEarned ?? 0) > 0
      );
      
      const pointsThisMonth = monthlyTransactions.reduce((sum, t) => sum + (t.pointsEarned ?? 0), 0);
      const recentRedemptions = redemptions.filter(r => 
        new Date(r.redeemedAt!) >= startOfMonth
      ).length;

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const currentTier = user.membershipTier || 'bronze';
      const currentPoints = user.totalPoints ?? 0;
      
      // Calculate next tier info using tier requirements
      const tierRequirements = { bronze: 0, silver: 1000, gold: 5000, platinum: 15000 };
      const tiers = ['bronze', 'silver', 'gold', 'platinum'];
      const currentIndex = tiers.indexOf(currentTier);
      const nextTier = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
      
      let pointsToNext = 0;
      let tierProgress = 100;
      
      if (nextTier) {
        const nextRequirement = tierRequirements[nextTier as keyof typeof tierRequirements];
        const currentRequirement = tierRequirements[currentTier as keyof typeof tierRequirements];
        pointsToNext = nextRequirement - currentPoints;
        tierProgress = ((currentPoints - currentRequirement) / (nextRequirement - currentRequirement)) * 100;
      }
      
      res.json({
        totalPoints: currentPoints,
        pointsThisMonth,
        totalTransactions: transactions.length,
        recentRedemptions,
        currentTier,
        nextTier,
        pointsToNext: Math.max(0, pointsToNext),
        tierProgress: Math.min(100, Math.max(0, tierProgress)),
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Recent activity endpoint
  app.get('/api/dashboard/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactions = await storage.getUserTransactions(userId);
      const redemptions = await storage.getUserRedemptions(userId);
      
      // Combine and sort recent activity
      const activity = [
        ...transactions.slice(-10).map(t => ({
          id: t.id,
          type: t.type,
          description: t.description,
          points: (t.pointsEarned || 0) - (t.pointsSpent || 0),
          date: t.createdAt!,
          status: t.status,
        })),
        ...redemptions.slice(-5).map(r => ({
          id: r.id,
          type: 'redemption',
          description: `Redeemed reward for ${r.pointsSpent} points`,
          points: -r.pointsSpent,
          date: r.redeemedAt!,
          status: r.status,
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
      
      res.json(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.get('/api/dashboard/reward-notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getPendingRewardNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching reward notifications:", error);
      res.status(500).json({ message: "Failed to fetch reward notifications" });
    }
  });

  app.patch('/api/dashboard/reward-notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { action } = z.object({
        action: z.enum(['redeem', 'dismiss']),
      }).parse(req.body);

      // Redemption itself remains exclusively POST /api/redemptions. The client
      // invokes this lightweight resolution only after that request succeeds.
      if (action === 'redeem') {
        const notification = await storage.getRewardNotification(id, userId);
        if (!notification) {
          return res.status(404).json({ message: "Reward notification not found" });
        }

        // A notification-referenced POST already resolves it. Treat the
        // frontend's follow-up PATCH as a successful idempotent operation.
        if (notification.status === "pending") {
          const redemptions = await storage.getUserRedemptions(userId);
          const hasMatchingRedemption = redemptions.some(
            (redemption) =>
              redemption.rewardId === notification.rewardId &&
              redemption.redeemedAt != null &&
              notification.createdAt != null &&
              redemption.redeemedAt >= notification.createdAt,
          );
          if (!hasMatchingRedemption) {
            return res.status(409).json({
              message: "Redeem this reward before resolving its notification",
            });
          }
        }
      }

      const resolved = await storage.resolveRewardNotification(
        id,
        userId,
        action === 'redeem' ? 'redeemed' : 'dismissed',
      );
      if (!resolved) {
        return res.status(404).json({ message: "Pending reward notification not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error resolving reward notification:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid notification action", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to resolve reward notification" });
      }
    }
  });

  app.post('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        userId,
      });
      const transaction = await storage.createTransaction(transactionData);
      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create transaction" });
      }
    }
  });

  // Redemption routes
  app.get('/api/redemptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const redemptions = await storage.getUserRedemptions(userId);
      res.json(redemptions);
    } catch (error) {
      console.error("Error fetching redemptions:", error);
      res.status(500).json({ message: "Failed to fetch redemptions" });
    }
  });

  app.post('/api/redemptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { rewardId, notificationId } = z.object({
        rewardId: z.string().min(1),
        notificationId: z.string().min(1).optional(),
      }).parse(req.body);

      // This dedicated operation uses the catalog cost, not any client-supplied
      // points value, and atomically protects the balance and notification.
      const { redemption } = await storage.redeemReward(
        userId,
        rewardId,
        notificationId,
      );
      res.json(redemption);
    } catch (error) {
      console.error("Error creating redemption:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid redemption data", errors: error.errors });
      } else if (error instanceof RedemptionOperationError) {
        res.status(error.status).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to redeem reward" });
      }
    }
  });

  app.patch('/api/redemptions/:id/use', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markRedemptionUsed(id);
      res.json({ message: "Redemption marked as used" });
    } catch (error) {
      console.error("Error marking redemption as used:", error);
      res.status(500).json({ message: "Failed to mark redemption as used" });
    }
  });

  // Offers routes
  app.get('/api/offers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const offers = await storage.getUserOffers(userId);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  app.post('/api/offers/:id/use', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markOfferUsed(id);
      res.json({ message: "Offer marked as used" });
    } catch (error) {
      console.error("Error marking offer as used:", error);
      res.status(500).json({ message: "Failed to mark offer as used" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/rewards', isAuthenticated, async (req, res) => {
    try {
      const rewards = await storage.getAllRewards();
      res.json(rewards);
    } catch (error) {
      console.error("Error fetching all rewards:", error);
      res.status(500).json({ message: "Failed to fetch all rewards" });
    }
  });

  // Enterprise Campaign Management Routes
  app.get('/api/campaigns', isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await storage.getCampaigns(page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post('/api/campaigns', isAuthenticated, async (req, res) => {
    try {
      const data = req.body;
      
      // Convert date strings to Date objects
      if (data.startDate) {
        data.startDate = new Date(data.startDate);
      }
      if (data.endDate) {
        data.endDate = new Date(data.endDate);
      }
      
      // Add createdBy from authenticated user
      data.createdBy = (req as any).user?.claims?.sub || 'system';
      
      const campaignData = insertCampaignSchema.parse(data);
      const campaign = await campaignService.createCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.get('/api/campaigns/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await storage.getCampaign(id);
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  app.put('/api/campaigns/:id/activate', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await campaignService.activateCampaign(id);
      
      if (!success) {
        return res.status(400).json({ message: "Failed to activate campaign" });
      }
      
      res.json({ message: "Campaign activated successfully" });
    } catch (error) {
      console.error("Error activating campaign:", error);
      res.status(500).json({ message: "Failed to activate campaign" });
    }
  });


  // Enhanced Points Engine Routes
  app.post('/api/points/calculate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { amount, category, orderId } = req.body;
      
      const calculation = await pointsEngineService.calculatePoints(
        userId,
        parseFloat(amount),
        category,
        orderId
      );
      
      res.json(calculation);
    } catch (error) {
      console.error("Error calculating points:", error);
      res.status(500).json({ message: "Failed to calculate points" });
    }
  });

  app.post('/api/points/transaction', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const transactionData = req.body;
      
      const transactionId = await pointsEngineService.recordTransaction(userId, transactionData);
      res.status(201).json({ transactionId });
    } catch (error) {
      console.error("Error recording transaction:", error);
      res.status(500).json({ message: "Failed to record transaction" });
    }
  });

  // Loyalty Account Routes
  app.get('/api/loyalty-account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const account = await storage.getLoyaltyAccount(userId);
      
      if (!account) {
        return res.status(404).json({ message: "Loyalty account not found" });
      }
      
      res.json(account);
    } catch (error) {
      console.error("Error fetching loyalty account:", error);
      res.status(500).json({ message: "Failed to fetch loyalty account" });
    }
  });

  // Earning Rules Management (Admin)
  app.get('/api/admin/earning-rules', isAuthenticated, async (req, res) => {
    try {
      const rules = await storage.getEarningRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching earning rules:", error);
      res.status(500).json({ message: "Failed to fetch earning rules" });
    }
  });

  app.post('/api/admin/earning-rules', isAuthenticated, async (req, res) => {
    try {
      const ruleData = insertEarningRuleSchema.parse(req.body);
      const rule = await storage.createEarningRule(ruleData);
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating earning rule:", error);
      res.status(500).json({ message: "Failed to create earning rule" });
    }
  });

  // Campaign Analytics
  app.get('/api/campaigns/:id/analytics', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const analytics = await campaignService.getCampaignAnalytics(id);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching campaign analytics:", error);
      res.status(500).json({ message: "Failed to fetch campaign analytics" });
    }
  });

  // Points Expiry Routes
  app.get('/api/points/expiry', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;

      // Auto-run expiry check on every fetch — safe to call repeatedly
      await storage.checkAndExpirePoints(userId);

      const info = await storage.getPointsExpiryInfo(userId);
      res.json(info);
    } catch (error) {
      console.error("Error fetching points expiry info:", error);
      res.status(500).json({ message: "Failed to fetch points expiry info" });
    }
  });

  app.post('/api/admin/run-expiry', combinedAuth, loadAdminContext, async (req: any, res) => {
    try {
      const result = await storage.runExpiryForAllUsers();
      console.log(`[Admin] Points expiry run: ${result.processed} users processed, ${result.expired} had points expired`);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error running points expiry:", error);
      res.status(500).json({ message: "Failed to run points expiry" });
    }
  });

  // Mount admin router with RBAC protection
  // combinedAuth sets req.user, then loadAdminContext verifies admin status
  app.use('/api/admin', combinedAuth, loadAdminContext, adminRouter);

  // System Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      features: {
        campaigns: true,
        notifications: true,
        pointsEngine: true,
        loyaltyAccounts: true,
        analytics: true,
        receiptUpload: true,
      },
    });
  });

  // Serve uploaded receipts as static files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  const httpServer = createServer(app);
  return httpServer;
}

function isInvoiceNumberConflict(error: unknown): boolean {
  let current: any = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (
      current.code === "23505" &&
      (current.constraint === "invoice_submissions_invoice_number_unique" ||
        String(current.detail ?? "").includes("(invoice_number)="))
    ) {
      return true;
    }
    current = current.cause;
  }
  return false;
}
