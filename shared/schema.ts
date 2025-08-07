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
