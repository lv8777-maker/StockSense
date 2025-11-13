import { Router } from "express";
import { storage } from "./storage";
import { loadAdminContext, authorizeRoles, requireSuperAdmin } from "./middleware/rbac";
import { insertRewardSchema } from "@shared/schema";

export const adminRouter = Router();

// Note: loadAdminContext is now applied at the app-level mount in routes.ts
// This ensures combinedAuth runs first to set req.user before RBAC checks

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 * All admin roles can access
 */
adminRouter.get("/stats", async (req, res) => {
  try {
    const stats = await storage.getUserStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

/**
 * GET /api/admin/users
 * List all users
 * Admin, Manager, Analyst can view
 */
adminRouter.get(
  "/users",
  authorizeRoles(["super_admin", "admin", "manager", "analyst"]),
  async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  }
);

/**
 * POST /api/admin/users/:userId/deactivate
 * Deactivate a user account
 * Super Admin and Admin only
 */
adminRouter.post(
  "/users/:userId/deactivate",
  authorizeRoles(["super_admin", "admin"]),
  async (req, res) => {
    try {
      await storage.deactivateUser(req.params.userId);
      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ message: "Failed to deactivate user" });
    }
  }
);

/**
 * GET /api/admin/rewards
 * List all rewards (active and inactive)
 * All admin roles can view
 */
adminRouter.get("/rewards", async (req, res) => {
  try {
    const rewards = await storage.getAllRewards();
    res.json(rewards);
  } catch (error) {
    console.error("Error fetching rewards:", error);
    res.status(500).json({ message: "Failed to fetch rewards" });
  }
});

/**
 * POST /api/admin/rewards
 * Create a new reward
 * Super Admin and Admin only
 */
adminRouter.post(
  "/rewards",
  authorizeRoles(["super_admin", "admin"]),
  async (req, res) => {
    try {
      const validatedData = insertRewardSchema.parse(req.body);
      const reward = await storage.createReward(validatedData);
      res.json(reward);
    } catch (error) {
      console.error("Error creating reward:", error);
      res.status(500).json({ message: "Failed to create reward" });
    }
  }
);

/**
 * DELETE /api/admin/rewards/:rewardId
 * Deactivate a reward (soft delete)
 * Super Admin and Admin only
 */
adminRouter.delete(
  "/rewards/:rewardId",
  authorizeRoles(["super_admin", "admin"]),
  async (req, res) => {
    try {
      await storage.softDeactivateReward(req.params.rewardId);
      res.json({ message: "Reward deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating reward:", error);
      res.status(500).json({ message: "Failed to deactivate reward" });
    }
  }
);

/**
 * GET /api/admin/admins
 * List all admin users
 * Super Admin only
 */
adminRouter.get("/admins", requireSuperAdmin, async (req, res) => {
  try {
    const admins = await storage.listAdminUsers();
    res.json(admins);
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Failed to fetch admins" });
  }
});

/**
 * POST /api/admin/admins
 * Create a new admin user
 * Super Admin only
 */
adminRouter.post("/admins", requireSuperAdmin, async (req, res) => {
  try {
    const { userId, email, role } = req.body;
    
    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required" });
    }

    const validRoles = ["super_admin", "admin", "manager", "analyst"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
    }
    
    const admin = await storage.createAdminUser({
      userId: userId || null,
      email,
      role,
      createdBy: req.admin!.id,
      isActive: true,
    });
    
    res.json(admin);
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ message: "Failed to create admin" });
  }
});

/**
 * GET /api/admin/profile
 * Get current admin's profile
 * All admin roles can access
 */
adminRouter.get("/profile", async (req, res) => {
  try {
    res.json(req.admin);
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({ message: "Failed to fetch admin profile" });
  }
});
