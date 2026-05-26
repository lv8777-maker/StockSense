import { Router } from "express";
import { storage } from "./storage";
import { loadAdminContext, authorizeRoles, requireSuperAdmin } from "./middleware/rbac";
import { insertRewardSchema } from "@shared/schema";

export const adminRouter = Router();

// Normalise SA mobile to +27[678]XXXXXXXX form. Returns null if invalid.
// Matches the same rule used by /api/auth/phone login so a reset value
// is always usable to sign in.
function normaliseSAPhone(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/[\s-]/g, "");
  let candidate: string | null = null;
  if (/^\+27[678]\d{8}$/.test(digits)) candidate = digits;
  else if (/^0[678]\d{8}$/.test(digits)) candidate = "+27" + digits.slice(1);
  return candidate;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
 * POST /api/admin/users/:userId/reset-contact
 * Reset (change) a user's email and/or phone number. The user is marked verified
 * immediately because an admin is vouching for them. Writes an audit log entry.
 * Super Admin and Admin only.
 */
adminRouter.post(
  "/users/:userId/reset-contact",
  authorizeRoles(["super_admin", "admin"]),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { email: rawEmail, phoneNumber: rawPhone, reason } = req.body ?? {};

      if (!rawEmail && !rawPhone) {
        return res
          .status(400)
          .json({ message: "Provide a new email, a new phone number, or both." });
      }

      const target = await storage.getUser(userId);
      if (!target) {
        return res.status(404).json({ message: "User not found" });
      }

      // Guard against privilege escalation: admin-linked accounts can only be
      // reset by a super_admin, and never the requester's own admin account.
      const targetAdmin = await storage.getAdminByUserId(userId);
      if (targetAdmin) {
        if (req.admin!.role !== "super_admin") {
          return res.status(403).json({
            message: "Only a super admin can reset contact details for an admin account.",
          });
        }
        if (targetAdmin.id === req.admin!.id) {
          return res.status(403).json({
            message: "You can't reset your own admin contact details from here.",
          });
        }
      }

      const updates: { email?: string; phoneNumber?: string; isVerified?: boolean; emailVerifiedAt?: Date } = {};
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};

      if (rawEmail !== undefined && rawEmail !== null && rawEmail !== "") {
        const email = String(rawEmail).trim().toLowerCase();
        if (!isValidEmail(email)) {
          return res.status(400).json({ message: "Please enter a valid email address." });
        }
        if (email !== (target.email ?? "").toLowerCase()) {
          const existing = await storage.getUserByEmail(email);
          if (existing && existing.id !== userId) {
            return res
              .status(409)
              .json({ message: "Another account is already using that email." });
          }
          updates.email = email;
          before.email = target.email;
          after.email = email;
        }
      }

      if (rawPhone !== undefined && rawPhone !== null && rawPhone !== "") {
        const phone = normaliseSAPhone(String(rawPhone));
        if (!phone) {
          return res.status(400).json({
            message:
              "Please enter a valid South African phone number (+27XXXXXXXXX or 0XXXXXXXXX).",
          });
        }
        if (phone !== target.phoneNumber) {
          const existing = await storage.getUserByPhone(phone);
          if (existing && existing.id !== userId) {
            return res
              .status(409)
              .json({ message: "Another account is already using that phone number." });
          }
          updates.phoneNumber = phone;
          before.phoneNumber = target.phoneNumber;
          after.phoneNumber = phone;
        }
      }

      if (Object.keys(updates).length === 0) {
        return res
          .status(400)
          .json({ message: "Nothing to change — the new values match the current ones." });
      }

      // Admin is vouching, so mark verified
      updates.isVerified = true;
      updates.emailVerifiedAt = new Date();

      const updated = await storage.updateUserProfile(userId, updates as any);

      await storage.createAuditLog({
        entityType: "user",
        entityId: userId,
        action: "reset_contact",
        changes: { before, after, reason: reason ?? null },
        performedBy: req.admin!.id,
        performedByType: "admin",
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
      });

      res.json({
        message: "Contact details updated.",
        user: {
          id: updated.id,
          email: updated.email,
          phoneNumber: updated.phoneNumber,
          isVerified: updated.isVerified,
        },
      });
    } catch (error) {
      console.error("Error resetting user contact:", error);
      res.status(500).json({ message: "Failed to reset contact details" });
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
