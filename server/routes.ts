import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupPhoneAuth, isAuthenticated } from "./phoneAuth";
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
import { insertRewardSchema, insertTransactionSchema, insertRedemptionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupPhoneAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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
      },
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
