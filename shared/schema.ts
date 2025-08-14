import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  text,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  gender: varchar("gender"),
  location: varchar("location"),
  totalPoints: integer("total_points").default(0),
  memberSince: timestamp("member_since").defaultNow(),
  membershipTier: varchar("membership_tier").default('bronze'), // bronze, silver, gold, platinum
  isActive: boolean("is_active").default(true),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(false),
  marketingMessages: boolean("marketing_messages").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rewards catalog
export const rewards = pgTable("rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  pointsCost: integer("points_cost").notNull(),
  category: varchar("category").notNull(), // food, merchandise, experiences, discounts
  imageUrl: varchar("image_url"),
  isActive: boolean("is_active").default(true),
  redemptionCount: integer("redemption_count").default(0),
  maxRedemptions: integer("max_redemptions"), // null for unlimited
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transactions (purchases and point earnings)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // purchase, bonus, redemption, adjustment
  amount: decimal("amount", { precision: 10, scale: 2 }),
  pointsEarned: integer("points_earned").default(0),
  pointsSpent: integer("points_spent").default(0),
  description: text("description").notNull(),
  orderId: varchar("order_id"), // external reference
  status: varchar("status").default('completed'), // pending, completed, failed, refunded
  createdAt: timestamp("created_at").defaultNow(),
});

// Reward redemptions
export const redemptions = pgTable("redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  rewardId: varchar("reward_id").notNull().references(() => rewards.id),
  pointsSpent: integer("points_spent").notNull(),
  status: varchar("status").default('active'), // active, used, expired, cancelled
  redemptionCode: varchar("redemption_code").unique(),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
});

// Personalized offers
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  offerType: varchar("offer_type").notNull(), // double_points, free_item, discount, bonus_points
  value: varchar("value"), // e.g., "2x", "20%", "100"
  isActive: boolean("is_active").default(true),
  isUsed: boolean("is_used").default(false),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Social media connections
export const socialConnections = pgTable("social_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  platform: varchar("platform").notNull(), // facebook, instagram, linkedin
  externalId: varchar("external_id"),
  isConnected: boolean("is_connected").default(true),
  bonusAwarded: boolean("bonus_awarded").default(false),
  connectedAt: timestamp("connected_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  redemptions: many(redemptions),
  offers: many(offers),
  socialConnections: many(socialConnections),
}));

export const rewardsRelations = relations(rewards, ({ many }) => ({
  redemptions: many(redemptions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const redemptionsRelations = relations(redemptions, ({ one }) => ({
  user: one(users, {
    fields: [redemptions.userId],
    references: [users.id],
  }),
  reward: one(rewards, {
    fields: [redemptions.rewardId],
    references: [rewards.id],
  }),
}));

export const offersRelations = relations(offers, ({ one }) => ({
  user: one(users, {
    fields: [offers.userId],
    references: [users.id],
  }),
}));

export const socialConnectionsRelations = relations(socialConnections, ({ one }) => ({
  user: one(users, {
    fields: [socialConnections.userId],
    references: [users.id],
  }),
}));

// Schema types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Additional types for API responses
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

export type Reward = typeof rewards.$inferSelect;
export type InsertReward = typeof rewards.$inferInsert;

export type Redemption = typeof redemptions.$inferSelect;
export type InsertRedemption = typeof redemptions.$inferInsert;

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

export const insertRewardSchema = createInsertSchema(rewards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  redemptionCount: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertRedemptionSchema = createInsertSchema(redemptions).omit({
  id: true,
  redeemedAt: true,
  redemptionCode: true,
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
});

export const insertSocialConnectionSchema = createInsertSchema(socialConnections).omit({
  id: true,
  connectedAt: true,
});
export type InsertSocialConnection = z.infer<typeof insertSocialConnectionSchema>;
export type SocialConnection = typeof socialConnections.$inferSelect;

// Enterprise-grade additions for MAV-LOY-2025

// Loyalty account management (enterprise tier tracking)
export const loyaltyAccounts = pgTable("loyalty_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  accountNumber: varchar("account_number").unique().notNull(), // MAV-XXXXXXXXXXXX
  currentTier: varchar("current_tier").default('bronze'), // bronze, silver, gold, platinum
  tierProgress: decimal("tier_progress", { precision: 5, scale: 2 }).default('0.00'), // percentage to next tier
  lifetimePoints: integer("lifetime_points").default(0),
  availablePoints: integer("available_points").default(0),
  pendingPoints: integer("pending_points").default(0),
  lastActivityDate: timestamp("last_activity_date"),
  tierStartDate: timestamp("tier_start_date").defaultNow(),
  nextTierRequirement: integer("next_tier_requirement"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaign management system
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // points_multiplier, bonus_offer, referral, birthday
  status: varchar("status").default('draft'), // draft, active, paused, completed, cancelled
  targetAudience: jsonb("target_audience"), // criteria for user segmentation
  rules: jsonb("rules"), // campaign business rules
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").default(0),
  successMetrics: jsonb("success_metrics"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification system
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type").notNull(), // push, email, sms, in_app
  category: varchar("category").notNull(), // points, rewards, promotions, system
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"), // additional payload
  status: varchar("status").default('pending'), // pending, sent, delivered, failed
  channel: varchar("channel"), // email address, phone number, device token
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin users for the system
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  role: varchar("role").notNull(), // super_admin, admin, manager, analyst
  permissions: jsonb("permissions"), // granular permissions
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  passwordHash: varchar("password_hash"),
  mfaSecret: varchar("mfa_secret"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System configuration and settings
export const systemConfig = pgTable("system_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category").notNull(), // points, tiers, notifications, security
  key: varchar("key").notNull(),
  value: jsonb("value").notNull(),
  dataType: varchar("data_type").notNull(), // string, number, boolean, json
  description: text("description"),
  isEditable: boolean("is_editable").default(true),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit logs for compliance
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull(), // user, transaction, reward, campaign
  entityId: varchar("entity_id").notNull(),
  action: varchar("action").notNull(), // create, update, delete, view
  changes: jsonb("changes"), // before/after values
  performedBy: varchar("performed_by"), // user or admin ID
  performedByType: varchar("performed_by_type").notNull(), // user, admin, system
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// User sessions for enhanced security
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionToken: varchar("session_token").notNull().unique(),
  refreshToken: varchar("refresh_token").unique(),
  deviceInfo: jsonb("device_info"),
  ipAddress: varchar("ip_address"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Point earning rules engine
export const earningRules = pgTable("earning_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // purchase, referral, social, birthday, bonus
  isActive: boolean("is_active").default(true),
  conditions: jsonb("conditions"), // spending thresholds, categories, etc.
  pointsAwarded: integer("points_awarded"),
  multiplier: decimal("multiplier", { precision: 5, scale: 2 }).default('1.00'),
  tierMultipliers: jsonb("tier_multipliers"), // different multipliers per tier
  maxPointsPerDay: integer("max_points_per_day"),
  maxPointsPerMonth: integer("max_points_per_month"),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Additional relations for enterprise features
export const loyaltyAccountsRelations = relations(loyaltyAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [loyaltyAccounts.userId],
    references: [users.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  notifications: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

// Additional type exports for enterprise features
export type LoyaltyAccount = typeof loyaltyAccounts.$inferSelect;
export type InsertLoyaltyAccount = typeof loyaltyAccounts.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;

export type EarningRule = typeof earningRules.$inferSelect;
export type InsertEarningRule = typeof earningRules.$inferInsert;

// Validation schemas for enterprise features
export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentParticipants: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  deliveredAt: true,
  readAt: true,
});

export const insertEarningRuleSchema = createInsertSchema(earningRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
