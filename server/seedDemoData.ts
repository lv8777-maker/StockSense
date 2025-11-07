/**
 * Demo Data Seeding Script
 * 
 * This script populates the database with realistic sample data for demonstrations.
 * Run this before a client presentation to show a polished, populated app.
 * 
 * Usage: tsx server/seedDemoData.ts
 */

import { db } from "./db";
import { rewards, campaigns } from "@shared/schema";
import { sql } from "drizzle-orm";

const sampleRewards = [
  // Food & Drinks
  {
    name: "R50 Starbucks Voucher",
    description: "Enjoy your favorite coffee drink at any Starbucks location in South Africa",
    pointsCost: 100,
    category: "food",
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
    isActive: true,
    stock: 100,
  },
  {
    name: "R100 Nando's Gift Card",
    description: "Flame-grilled PERi-PERi chicken for you and your friends",
    pointsCost: 200,
    category: "food",
    imageUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400",
    isActive: true,
    stock: 75,
  },
  {
    name: "R150 Woolworths Food Voucher",
    description: "Premium quality food and beverages from Woolworths",
    pointsCost: 300,
    category: "food",
    imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
    isActive: true,
    stock: 50,
  },
  {
    name: "R200 Restaurant Voucher",
    description: "Fine dining experience at participating restaurants",
    pointsCost: 400,
    category: "food",
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400",
    isActive: true,
    stock: 30,
  },

  // Merchandise
  {
    name: "Wireless Bluetooth Earbuds",
    description: "Premium sound quality with active noise cancellation",
    pointsCost: 500,
    category: "merchandise",
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400",
    isActive: true,
    stock: 25,
  },
  {
    name: "Maverick Branded Backpack",
    description: "Durable water-resistant backpack with laptop compartment",
    pointsCost: 350,
    category: "merchandise",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
    isActive: true,
    stock: 40,
  },
  {
    name: "Portable Power Bank 20000mAh",
    description: "Fast charging power bank for all your devices",
    pointsCost: 400,
    category: "merchandise",
    imageUrl: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400",
    isActive: true,
    stock: 35,
  },
  {
    name: "Smartwatch Fitness Tracker",
    description: "Track your health and fitness goals in style",
    pointsCost: 800,
    category: "merchandise",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
    isActive: true,
    stock: 15,
  },

  // Experiences
  {
    name: "Movie Night for Two",
    description: "Two cinema tickets with popcorn and drinks at Ster-Kinekor",
    pointsCost: 300,
    category: "experiences",
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400",
    isActive: true,
    stock: 60,
  },
  {
    name: "Spa Day Package",
    description: "Full day spa treatment including massage and facial",
    pointsCost: 1000,
    category: "experiences",
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400",
    isActive: true,
    stock: 20,
  },
  {
    name: "Adventure Experience Voucher",
    description: "Choose from skydiving, bungee jumping, or shark cage diving",
    pointsCost: 1500,
    category: "experiences",
    imageUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400",
    isActive: true,
    stock: 10,
  },
  {
    name: "Weekend Getaway for Two",
    description: "2-night stay at a luxury boutique hotel",
    pointsCost: 2000,
    category: "experiences",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
    isActive: true,
    stock: 8,
  },

  // Discounts
  {
    name: "10% Off Next Purchase",
    description: "Apply this discount code to your next Maverick purchase",
    pointsCost: 50,
    category: "discounts",
    imageUrl: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400",
    isActive: true,
    stock: 200,
  },
  {
    name: "R100 Airtime Credit",
    description: "Instant R100 airtime credit to your account",
    pointsCost: 100,
    category: "discounts",
    imageUrl: "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400",
    isActive: true,
    stock: 150,
  },
  {
    name: "Free Data Upgrade (5GB)",
    description: "Get an extra 5GB of data added to your plan this month",
    pointsCost: 250,
    category: "discounts",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400",
    isActive: true,
    stock: 100,
  },
  {
    name: "Premium Plan Free Month",
    description: "One month free upgrade to our premium plan",
    pointsCost: 1200,
    category: "discounts",
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400",
    isActive: true,
    stock: 25,
  },
];

const sampleCampaigns = [
  {
    name: "Double Points Weekend",
    description: "Earn 2x points on all purchases made this weekend! Valid Friday 6PM - Sunday 11:59PM",
    type: "points_multiplier" as const,
    status: "active" as const,
    startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Started yesterday
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Ends in 3 days
    rules: {
      pointsMultiplier: 2,
      minSpend: 50,
    },
    targetAudience: {
      tiers: ["starter", "explorer", "champion", "elite"],
    },
    currentParticipants: 127,
    maxParticipants: 1000,
    createdBy: "demo-seed-script",
  },
  {
    name: "New User Welcome Bonus",
    description: "New members get 200 bonus points after their first receipt upload",
    type: "bonus_points" as const,
    status: "active" as const,
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Started 7 days ago
    endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000), // Ends in 23 days
    rules: {
      bonusPoints: 200,
      maxRedemptions: 1,
    },
    targetAudience: {
      tiers: ["starter"],
      maxPoints: 500,
    },
    currentParticipants: 89,
    maxParticipants: 500,
    createdBy: "demo-seed-script",
  },
  {
    name: "Champion Tier Upgrade Challenge",
    description: "Reach Champion tier this month and get 500 bonus points!",
    type: "tier_upgrade" as const,
    status: "active" as const,
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Started 14 days ago
    endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), // Ends in 16 days
    rules: {
      bonusPoints: 500,
    },
    targetAudience: {
      tiers: ["explorer"],
      minPoints: 500,
      maxPoints: 1499,
    },
    currentParticipants: 34,
    maxParticipants: 200,
    createdBy: "demo-seed-script",
  },
  {
    name: "Holiday Season Cashback",
    description: "Get 15% cashback in points on all accessory purchases over R500",
    type: "cashback" as const,
    status: "active" as const,
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Started 3 days ago
    endDate: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000), // Ends in 27 days
    rules: {
      minSpend: 500,
      bonusPoints: 15, // 15% cashback
    },
    targetAudience: {
      tiers: ["champion", "elite"],
    },
    currentParticipants: 56,
    maxParticipants: 300,
    createdBy: "demo-seed-script",
  },
  {
    name: "Elite Member Exclusive",
    description: "Elite members only: 3x points on all plan upgrades",
    type: "points_multiplier" as const,
    status: "draft" as const,
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Starts in 7 days
    endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000), // Ends in 37 days
    rules: {
      pointsMultiplier: 3,
    },
    targetAudience: {
      tiers: ["elite"],
      minPoints: 3000,
    },
    currentParticipants: 0,
    maxParticipants: 100,
    createdBy: "demo-seed-script",
  },
];

async function seedDemoData() {
  console.log("🌱 Starting demo data seeding...\n");

  try {
    // Clear existing demo data (campaigns only - rewards may have redemptions)
    console.log("🧹 Clearing existing campaigns...");
    await db.delete(campaigns);
    console.log("✅ Cleared existing campaigns\n");
    
    console.log("ℹ️  Note: Existing rewards preserved (may have redemption history)\n");

    // Seed rewards (additive - doesn't clear existing)
    console.log("🎁 Adding sample rewards...");
    let rewardsAdded = 0;
    for (const reward of sampleRewards) {
      try {
        await db.insert(rewards).values(reward);
        console.log(`   ✓ Added: ${reward.name} (${reward.pointsCost} points)`);
        rewardsAdded++;
      } catch (error: any) {
        // Check if it's a duplicate or another error
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          console.log(`   ⊘ Skipped: ${reward.name} (already exists)`);
        } else {
          console.log(`   ⚠ Warning: Failed to add ${reward.name} - ${error.message || 'Unknown error'}`);
        }
      }
    }
    console.log(`✅ Added ${rewardsAdded} new rewards\n`);

    // Seed campaigns
    console.log("📢 Seeding campaigns...");
    for (const campaign of sampleCampaigns) {
      await db.insert(campaigns).values(campaign);
      console.log(`   ✓ Added: ${campaign.name} (${campaign.status})`);
    }
    console.log(`✅ Seeded ${sampleCampaigns.length} campaigns\n`);

    console.log("🎉 Demo data seeding completed successfully!\n");
    console.log("📊 Summary:");
    console.log(`   - ${rewardsAdded} rewards added (skipped existing duplicates)`);
    console.log(`   - ${sampleCampaigns.length} campaigns replaced (${sampleCampaigns.filter(c => c.status === 'active').length} active, ${sampleCampaigns.filter(c => c.status === 'draft').length} draft)`);
    console.log("\n✨ Your app is now ready for an impressive demo!\n");

  } catch (error) {
    console.error("❌ Error seeding demo data:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seeding function
seedDemoData();
