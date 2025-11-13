# Admin Dashboard Implementation Guide

**Date:** November 12, 2025  
**Status:** Ready to Implement  
**Estimated Time:** 8 days (Phase 2 task)

---

## 📊 Current State

### ✅ What Exists
- **Frontend UI**: Complete admin dashboard (`client/src/pages/admin.tsx`)
  - Customer Management tab (search, view, export users)
  - Rewards Management tab (create/deactivate rewards)
  - Analytics tab (placeholder charts)
  - Stats overview cards
- **Database Schema**: `adminUsers` table defined in `shared/schema.ts`
- **Route**: `/admin` path registered in `App.tsx`

### ❌ What's Missing
- **Backend API routes** - No endpoints for admin operations
- **RBAC Middleware** - No role-based access control
- **Admin Creation** - No way to promote users to admin
- **Security** - Admin page accessible to ANY authenticated user

---

## 🎯 Implementation Plan

### **Phase 1: Database Schema** (2 hours)

#### 1.1 Update adminUsers Table
Add `userId` foreign key to link admins to regular users:

```typescript
// In shared/schema.ts

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // NEW: Link to users table
  email: varchar("email").notNull().unique(),
  role: varchar("role").notNull(), // super_admin, admin, manager, analyst
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"), // Admin ID who created this admin
});
```

**Rationale:** This allows admins to also be loyalty program members. A super_admin can use the loyalty app AND manage it.

#### 1.2 Apply Schema Changes
```bash
npm run db:push --force
```

---

### **Phase 2: RBAC Middleware** (4 hours)

#### 2.1 Create RBAC Middleware File
Create `server/middleware/rbac.ts`:

```typescript
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

// Load admin context from authenticated user
export async function loadAdminContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.claims?.sub;
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

// Check if admin has one of the required roles
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

// Helper: Check if admin has super_admin role
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  return authorizeRoles(["super_admin"])(req, res, next);
}
```

**Key Features:**
- ✅ Loads admin context from userId
- ✅ Checks if admin is active
- ✅ Role-based authorization
- ✅ Clear 403 responses for unauthorized access

---

### **Phase 3: Storage Layer** (3 hours)

#### 3.1 Add Admin Methods to IStorage
Update `server/storage.ts`:

```typescript
export interface IStorage {
  // ... existing methods ...

  // Admin User Management
  getAdminByUserId(userId: string): Promise<AdminUser | null>;
  getAdminById(adminId: string): Promise<AdminUser | null>;
  listAdminUsers(): Promise<AdminUser[]>;
  createAdmin(data: InsertAdminUser): Promise<AdminUser>;
  updateAdmin(adminId: string, updates: Partial<AdminUser>): Promise<AdminUser>;
  deactivateAdmin(adminId: string): Promise<void>;

  // Admin Operations
  getAdminStats(): Promise<{
    totalCustomers: number;
    activeRewards: number;
    totalPointsRedeemed: number;
    monthlyRevenue: string;
  }>;
  listAllUsers(): Promise<User[]>;
  listAllRewards(): Promise<Reward[]>;
  deactivateUser(userId: string): Promise<void>;
  softDeactivateReward(rewardId: string): Promise<void>;
}
```

#### 3.2 Implement in DBStorage
Add implementations in `server/storage.ts` DBStorage class:

```typescript
async getAdminByUserId(userId: string): Promise<AdminUser | null> {
  const result = await this.db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.userId, userId))
    .limit(1);
  return result[0] || null;
}

async getAdminStats() {
  const [totalCustomers] = await this.db
    .select({ count: sql<number>`count(*)` })
    .from(users);

  const [activeRewards] = await this.db
    .select({ count: sql<number>`count(*)` })
    .from(rewards)
    .where(eq(rewards.isActive, true));

  const [pointsRedeemed] = await this.db
    .select({ total: sql<number>`coalesce(sum(${transactions.pointsSpent}), 0)` })
    .from(transactions)
    .where(eq(transactions.type, 'redemption'));

  // Calculate monthly revenue from transactions
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const [revenue] = await this.db
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(sql`${transactions.createdAt} >= ${currentMonth}`);

  return {
    totalCustomers: totalCustomers?.count || 0,
    activeRewards: activeRewards?.count || 0,
    totalPointsRedeemed: pointsRedeemed?.total || 0,
    monthlyRevenue: (revenue?.total || 0).toFixed(2),
  };
}

async listAllUsers(): Promise<User[]> {
  return await this.db.select().from(users).orderBy(desc(users.createdAt));
}

async listAllRewards(): Promise<Reward[]> {
  return await this.db.select().from(rewards).orderBy(desc(rewards.createdAt));
}

async deactivateUser(userId: string): Promise<void> {
  await this.db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

async softDeactivateReward(rewardId: string): Promise<void> {
  await this.db
    .update(rewards)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(rewards.id, rewardId));
}
```

---

### **Phase 4: Admin API Routes** (5 hours)

#### 4.1 Create Admin Router
Create `server/adminRoutes.ts`:

```typescript
import { Router } from "express";
import { storage } from "./storage";
import { loadAdminContext, authorizeRoles, requireSuperAdmin } from "./middleware/rbac";
import { insertRewardSchema } from "@shared/schema";

export const adminRouter = Router();

// Apply admin authentication to all routes
adminRouter.use(loadAdminContext);

// Stats - All admins can view
adminRouter.get("/stats", async (req, res) => {
  try {
    const stats = await storage.getAdminStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// List all users - Admin, Manager, Analyst can view
adminRouter.get(
  "/users",
  authorizeRoles(["super_admin", "admin", "manager", "analyst"]),
  async (req, res) => {
    try {
      const users = await storage.listAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  }
);

// Deactivate user - Super Admin and Admin only
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

// List all rewards - All admins can view
adminRouter.get("/rewards", async (req, res) => {
  try {
    const rewards = await storage.listAllRewards();
    res.json(rewards);
  } catch (error) {
    console.error("Error fetching rewards:", error);
    res.status(500).json({ message: "Failed to fetch rewards" });
  }
});

// Create reward - Super Admin and Admin only
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

// Deactivate reward - Super Admin and Admin only
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

// List all admins - Super Admin only
adminRouter.get("/admins", requireSuperAdmin, async (req, res) => {
  try {
    const admins = await storage.listAdminUsers();
    res.json(admins);
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Failed to fetch admins" });
  }
});

// Create new admin - Super Admin only
adminRouter.post("/admins", requireSuperAdmin, async (req, res) => {
  try {
    const { userId, email, role } = req.body;
    
    const admin = await storage.createAdmin({
      userId,
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
```

#### 4.2 Register Admin Router
In `server/routes.ts`:

```typescript
import { adminRouter } from "./adminRoutes";

// After existing routes, add:
app.use('/api/admin', combinedAuth, adminRouter);
```

---

### **Phase 5: Admin Promotion Script** (2 hours)

#### 5.1 Create CLI Script
Create `scripts/promoteAdmin.ts`:

```typescript
import { storage } from "../server/storage";

async function promoteUserToAdmin() {
  const email = process.argv[2];
  const role = process.argv[3] || "admin";

  if (!email) {
    console.error("Usage: tsx scripts/promoteAdmin.ts <email> [role]");
    console.error("Roles: super_admin, admin, manager, analyst");
    process.exit(1);
  }

  try {
    // Find user by email
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    // Check if already an admin
    const existingAdmin = await storage.getAdminByUserId(user.id);
    if (existingAdmin) {
      console.error(`❌ User is already an admin with role: ${existingAdmin.role}`);
      process.exit(1);
    }

    // Create admin
    const admin = await storage.createAdmin({
      userId: user.id,
      email: user.email!,
      role,
      isActive: true,
    });

    console.log(`✅ Successfully promoted ${email} to ${role}`);
    console.log(`   Admin ID: ${admin.id}`);
    console.log(`   User ID: ${user.id}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error promoting user:", error);
    process.exit(1);
  }
}

promoteUserToAdmin();
```

**Usage:**
```bash
# Promote user to admin
tsx scripts/promoteAdmin.ts user@example.com admin

# Promote user to super_admin
tsx scripts/promoteAdmin.ts admin@example.com super_admin
```

---

### **Phase 6: Frontend Updates** (3 hours)

#### 6.1 Update useAuth Hook
Add admin context to `hooks/useAuth.ts`:

```typescript
export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Check if user is admin
  const { data: adminProfile } = useQuery({
    queryKey: ["/api/admin/profile"],
    enabled: !!user,
    retry: false,
  });

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    isAdmin: !!adminProfile,
    adminRole: adminProfile?.role,
  };
}
```

#### 6.2 Protect Admin Route
Update `App.tsx` to redirect non-admins:

```typescript
import { Navigate } from "wouter";

function ProtectedAdminRoute() {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  
  return <Admin />;
}

// In Router:
<Route path="/admin" component={ProtectedAdminRoute} />
```

#### 6.3 Update Navbar
Add admin link only for admins:

```typescript
const { isAdmin } = useAuth();

{isAdmin && (
  <Link href="/admin" className="flex items-center px-3 py-2">
    <Shield className="mr-2 h-4 w-4" />
    Admin Panel
  </Link>
)}
```

---

## 🔒 Permission Matrix

| Role | View Stats | View Users | Deactivate Users | View Rewards | Create/Edit Rewards | Manage Admins | View Analytics |
|------|-----------|-----------|-----------------|-------------|-------------------|--------------|---------------|
| **super_admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **manager** | ✅ | ✅ (read-only) | ❌ | ✅ (read-only) | ❌ | ❌ | ✅ |
| **analyst** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🛡️ Security Measures

### 1. Session Management
- Admin sessions stored in same PostgreSQL sessions table
- Short-lived sessions for admin operations (consider 1-hour timeout)
- Require re-authentication for sensitive operations

### 2. Audit Logging
Wire up `auditLogs` table to track:
- Admin login/logout
- User deactivation
- Reward creation/deletion
- Admin creation (who created whom)

### 3. Rate Limiting
Apply stricter rate limits to admin endpoints:
```typescript
import rateLimit from "express-rate-limit";

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each admin to 100 requests per window
});

app.use('/api/admin', adminLimiter);
```

### 4. Environment Protection
Never allow admin endpoints in production without:
- SSL/TLS encryption
- IP whitelisting (optional)
- MFA/2FA (future enhancement)

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe("RBAC Middleware", () => {
  it("should reject non-admin users", async () => {
    // Test loadAdminContext rejects regular users
  });

  it("should allow super_admin all permissions", async () => {
    // Test super_admin can access all routes
  });

  it("should enforce role-based access", async () => {
    // Test analyst cannot deactivate users
  });
});
```

### Integration Tests
```typescript
describe("Admin API Routes", () => {
  it("GET /api/admin/stats requires admin access", async () => {
    // Test 403 for non-admin
  });

  it("POST /api/admin/admins requires super_admin", async () => {
    // Test only super_admin can create admins
  });
});
```

### E2E Tests (Playwright)
```typescript
test("Admin dashboard redirects non-admins", async ({ page }) => {
  await loginAsRegularUser(page);
  await page.goto("/admin");
  await expect(page).toHaveURL("/dashboard");
});

test("Super admin can create new admin", async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto("/admin");
  // Test admin creation flow
});
```

---

## 📋 Implementation Checklist

### Backend
- [ ] Update `adminUsers` table with `userId` FK
- [ ] Run `npm run db:push --force` to apply schema
- [ ] Create `server/middleware/rbac.ts`
- [ ] Add admin methods to `IStorage` interface
- [ ] Implement admin methods in `DBStorage` class
- [ ] Create `server/adminRoutes.ts` with protected endpoints
- [ ] Register admin router in `server/routes.ts`
- [ ] Create `scripts/promoteAdmin.ts` CLI tool
- [ ] Test admin promotion script

### Frontend
- [ ] Update `useAuth` hook to check admin status
- [ ] Create `ProtectedAdminRoute` component
- [ ] Update `App.tsx` routing
- [ ] Add admin link to Navbar (conditional)
- [ ] Test admin redirect for non-admin users

### Security
- [ ] Add rate limiting to `/api/admin` routes
- [ ] Implement audit logging for admin actions
- [ ] Test permission matrix (all roles)
- [ ] Security review of RBAC implementation

### Documentation
- [ ] Update `replit.md` with admin implementation
- [ ] Document admin promotion process
- [ ] Create admin user guide

---

## 🚀 Deployment Steps

1. **Create First Super Admin:**
   ```bash
   # After user registers via normal flow
   tsx scripts/promoteAdmin.ts admin@maverick.com super_admin
   ```

2. **Verify Admin Access:**
   - Login as the promoted user
   - Navigate to `/admin`
   - Verify all tabs load correctly

3. **Create Additional Admins:**
   - Use the Admin Panel → "Manage Admins" (to be built)
   - OR use CLI script for each admin

---

## 💡 Future Enhancements

1. **MFA/2FA** - Add two-factor authentication for admin accounts
2. **Admin Activity Dashboard** - Show recent admin actions
3. **IP Whitelisting** - Restrict admin access to specific IPs
4. **Approval Workflows** - Require approval for sensitive actions
5. **Advanced Analytics** - Real-time charts and reporting
6. **Bulk Operations** - Import/export users, mass updates
7. **Role Customization** - Create custom roles with granular permissions

---

**Estimated Total Time:** 8 days  
**Priority:** Medium (Phase 2)  
**Dependencies:** None (can start immediately)  
**Risk Level:** Low (well-defined scope)
