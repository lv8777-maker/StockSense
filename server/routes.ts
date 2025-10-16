import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupPhoneAuth, isAuthenticated } from "./phoneAuth";
import { setupEmailAuth, isEmailAuthenticated } from "./emailAuth";
import { uploadLimiter } from "./rateLimiter";
import { notificationService } from "./services/NotificationService";
import { campaignService } from "./services/CampaignService";
import { pointsEngineService } from "./services/PointsEngineService";
import { 
  insertRewardSchema, 
  insertTransactionSchema, 
  insertRedemptionSchema,
  insertCampaignSchema,
  insertNotificationSchema,
  insertEarningRuleSchema 
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { processReceiptImage, isValidReceiptFile } from "./receiptProcessor";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupPhoneAuth(app);
  await setupEmailAuth(app);
  
  // Combined auth middleware - accepts both phone and email auth
  const combinedAuth: typeof isAuthenticated = (req, res, next) => {
    // Try phone auth first, then email auth
    isAuthenticated(req, res, (err) => {
      if (err) return next(err);
      if (req.user) return next();
      
      // If phone auth failed, try email auth
      isEmailAuthenticated(req, res, next);
    });
  };

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
      if (isValidReceiptFile(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
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
  app.get('/api/rewards', isAuthenticated, async (req, res) => {
    try {
      const rewards = await storage.getActiveRewards();
      res.json(rewards);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      res.status(500).json({ message: "Failed to fetch rewards" });
    }
  });

  app.post('/api/rewards', isAuthenticated, async (req, res) => {
    try {
      const rewardData = insertRewardSchema.parse(req.body);
      const reward = await storage.createReward(rewardData);
      res.json(reward);
    } catch (error) {
      console.error("Error creating reward:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid reward data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create reward" });
      }
    }
  });

  app.patch('/api/rewards/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const reward = await storage.updateReward(id, updates);
      res.json(reward);
    } catch (error) {
      console.error("Error updating reward:", error);
      res.status(500).json({ message: "Failed to update reward" });
    }
  });

  app.delete('/api/rewards/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deactivateReward(id);
      res.json({ message: "Reward deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating reward:", error);
      res.status(500).json({ message: "Failed to deactivate reward" });
    }
  });

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

      // Create initial receipt upload record
      const receiptUpload = await storage.createReceiptUpload({
        userId,
        fileName,
        fileUrl,
        status: 'processing',
      });

      // Process receipt with OCR in background
      try {
        const processed = await processReceiptImage(filePath);

        // Create transaction if points were awarded
        let transactionId = null;
        if (processed.pointsAwarded > 0) {
          const transaction = await storage.createTransaction({
            userId,
            type: 'earning',
            description: processed.description,
            amount: processed.detectedAmount?.toString() || '0.00',
            pointsEarned: processed.pointsAwarded,
            pointsSpent: 0,
            status: 'completed',
            orderId: `RCP-${receiptUpload.id.substring(0, 8)}`,
          });
          transactionId = transaction.id;

          // Update user's total points
          await storage.updateUserPoints(userId, processed.pointsAwarded);
        }

        // Update receipt upload with processing results
        const updatedReceipt = await storage.updateReceiptUpload(receiptUpload.id, {
          transactionId,
          ocrText: processed.ocrText,
          purchaseType: processed.purchaseType,
          detectedAmount: processed.detectedAmount?.toString(),
          detectedPlan: processed.detectedPlan,
          pointsAwarded: processed.pointsAwarded,
          status: 'completed',
        });

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
        new Date(t.createdAt!) >= startOfMonth && t.pointsEarned > 0
      );
      
      const pointsThisMonth = monthlyTransactions.reduce((sum, t) => sum + (t.pointsEarned || 0), 0);
      const recentRedemptions = redemptions.filter(r => 
        new Date(r.redeemedAt!) >= startOfMonth
      ).length;

      const currentTier = user.membershipTier || 'bronze';
      const currentPoints = user.totalPoints || 0;
      
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
      const redemptionData = insertRedemptionSchema.parse({
        ...req.body,
        userId,
      });

      // Check if user has enough points
      const user = await storage.getUser(userId);
      if (!user || user.totalPoints < redemptionData.pointsSpent) {
        return res.status(400).json({ message: "Insufficient points" });
      }

      const redemption = await storage.createRedemption(redemptionData);
      
      // Create transaction for points spent
      await storage.createTransaction({
        userId,
        type: 'redemption',
        pointsSpent: redemptionData.pointsSpent,
        description: `Redeemed reward: ${redemption.id}`,
        status: 'completed',
      });

      res.json(redemption);
    } catch (error) {
      console.error("Error creating redemption:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid redemption data", errors: error.errors });
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

  // Social connection routes
  app.get('/api/social-connections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const connections = await storage.getUserSocialConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching social connections:", error);
      res.status(500).json({ message: "Failed to fetch social connections" });
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
      const campaignData = insertCampaignSchema.parse(req.body);
      const campaign = await campaignService.createCampaign({
        ...campaignData,
        createdBy: req.user?.claims?.sub || 'system',
      });
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

  // Notification System Routes
  app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const notifications = await storage.getNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      
      const success = await storage.markNotificationAsRead(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notificationId = await notificationService.createNotification(notificationData);
      res.status(201).json({ id: notificationId });
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  // Enhanced Points Engine Routes
  app.post('/api/points/calculate', isAuthenticated, async (req, res) => {
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

  app.post('/api/points/transaction', isAuthenticated, async (req, res) => {
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
  app.get('/api/loyalty-account', isAuthenticated, async (req, res) => {
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

  // Enhanced Admin Dashboard Routes
  app.get('/api/admin/dashboard-stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      
      // Add campaign stats
      const campaigns = await storage.getCampaigns(1, 1000);
      const activeCampaigns = campaigns.campaigns.filter(c => c.status === 'active').length;
      
      res.json({
        ...stats,
        activeCampaigns,
        totalCampaigns: campaigns.total,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

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
