import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Extend Express Request type to include admin
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        email: string;
        role: string;
        userId?: string;
      };
    }
  }
}

/**
 * Load admin context from authenticated user
 * This middleware checks if the authenticated user is an admin
 * Supports both phone auth (req.user.claims.sub) and email auth (req.user.id)
 */
export async function loadAdminContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Support both phone auth (claims.sub) and email auth (id)
    const userId = (req as any).user?.claims?.sub || (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if this user is an admin
    const admin = await storage.getAdminByUserId(userId);
    
    if (!admin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: "Admin account is deactivated" });
    }

    // Attach admin context to request
    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      userId: admin.userId || undefined,
    };

    next();
  } catch (error) {
    console.error("Admin context error:", error);
    res.status(500).json({ message: "Failed to verify admin access" });
  }
}

/**
 * Check if admin has one of the required roles
 * @param allowedRoles Array of role names that can access this route
 */
export function authorizeRoles(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ 
        message: `Insufficient permissions. Required roles: ${allowedRoles.join(", ")}` 
      });
    }

    next();
  };
}

/**
 * Helper: Check if admin has super_admin role
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  return authorizeRoles(["super_admin"])(req, res, next);
}
