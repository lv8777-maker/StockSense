import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertRewardSchema, insertTransactionSchema, insertRedemptionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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

  const httpServer = createServer(app);
  return httpServer;
}
