# Demo Data Setup Guide

## 🎯 Purpose

This guide explains how to populate your Maverick Loyalty App with realistic demo data for impressive client presentations.

---

## 📦 What Gets Seeded

### Rewards (16 total)

**Food & Drinks (4 rewards):**
- R50 Starbucks Voucher (100 points)
- R100 Nando's Gift Card (200 points)
- R150 Woolworths Food Voucher (300 points)
- R200 Restaurant Voucher (400 points)

**Merchandise (4 rewards):**
- Wireless Bluetooth Earbuds (500 points)
- Maverick Branded Backpack (350 points)
- Portable Power Bank 20000mAh (400 points)
- Smartwatch Fitness Tracker (800 points)

**Experiences (4 rewards):**
- Movie Night for Two (300 points)
- Spa Day Package (1000 points)
- Adventure Experience Voucher (1500 points)
- Weekend Getaway for Two (2000 points)

**Discounts (4 rewards):**
- 10% Off Next Purchase (50 points)
- R100 Airtime Credit (100 points)
- Free Data Upgrade 5GB (250 points)
- Premium Plan Free Month (1200 points)

### Campaigns (5 total)

**Active Campaigns (4):**
1. **Double Points Weekend** - 2x points multiplier on all purchases
2. **New User Welcome Bonus** - 200 bonus points after first upload
3. **Champion Tier Upgrade Challenge** - 500 points for reaching Champion
4. **Holiday Season Cashback** - 15% cashback on accessories

**Draft Campaigns (1):**
1. **Elite Member Exclusive** - 3x points on plan upgrades (future campaign)

---

## 🚀 How to Seed Demo Data

### Method 1: Run the Seeding Script

```bash
tsx server/seedDemoData.ts
```

**What happens:**
1. **Clears and replaces** all existing campaigns (preserves users and transactions)
2. **Additively inserts** 16 sample rewards (skips duplicates, preserves existing rewards)
3. Inserts 5 sample campaigns (4 active, 1 draft)
4. Displays success confirmation

**Why preserve existing rewards?**
- Existing rewards may have redemption history (foreign key constraints)
- Deleting them would break user redemption records
- Additive approach is safer for demo purposes

**Output (First Run):**
```
🌱 Starting demo data seeding...

🧹 Clearing existing campaigns...
✅ Cleared existing campaigns

ℹ️  Note: Existing rewards preserved (may have redemption history)

🎁 Adding sample rewards...
   ✓ Added: R50 Starbucks Voucher (100 points)
   ✓ Added: R100 Nando's Gift Card (200 points)
   ✓ Added: R150 Woolworths Food Voucher (300 points)
   ✓ Added: R200 Restaurant Voucher (400 points)
   ✓ Added: Wireless Bluetooth Earbuds (500 points)
   ✓ Added: Maverick Branded Backpack (350 points)
   ✓ Added: Portable Power Bank 20000mAh (400 points)
   ✓ Added: Smartwatch Fitness Tracker (800 points)
   ✓ Added: Movie Night for Two (300 points)
   ✓ Added: Spa Day Package (1000 points)
   ✓ Added: Adventure Experience Voucher (1500 points)
   ✓ Added: Weekend Getaway for Two (2000 points)
   ✓ Added: 10% Off Next Purchase (50 points)
   ✓ Added: R100 Airtime Credit (100 points)
   ✓ Added: Free Data Upgrade (5GB) (250 points)
   ✓ Added: Premium Plan Free Month (1200 points)
✅ Added 16 new rewards

📢 Seeding campaigns...
   ✓ Added: Double Points Weekend (active)
   ✓ Added: New User Welcome Bonus (active)
   ✓ Added: Champion Tier Upgrade Challenge (active)
   ✓ Added: Holiday Season Cashback (active)
   ✓ Added: Elite Member Exclusive (draft)
✅ Seeded 5 campaigns

🎉 Demo data seeding completed successfully!

📊 Summary:
   - 16 rewards added (skipped existing duplicates)
   - 5 campaigns replaced (4 active, 1 draft)

✨ Your app is now ready for an impressive demo!
```

**Output (Subsequent Runs):**
If you run the script again, you'll see rewards being skipped:
```
🎁 Adding sample rewards...
   ⊘ Skipped: R50 Starbucks Voucher (already exists)
   ⊘ Skipped: R100 Nando's Gift Card (already exists)
   ...
✅ Added 0 new rewards
```
Campaigns are always refreshed regardless.

---

### Method 2: Manual Entry via Admin Panel

If you prefer manual control:

1. Navigate to `/admin`
2. Go to "Rewards Management" tab
3. Click "Create New Reward"
4. Fill in details from the list above
5. Repeat for each reward

**Advantages:**
- More control over individual items
- Can customize on the fly
- Good for learning the admin interface

**Disadvantages:**
- Time-consuming (16 rewards + 5 campaigns)
- Prone to typos
- Inconsistent formatting

---

## ⏰ When to Seed Demo Data

### Before Client Presentation
Run the script 15-30 minutes before your demo:
```bash
tsx server/seedDemoData.ts
```

This ensures:
- Fresh campaigns (all campaigns replaced)
- Sample rewards available (additive, won't break existing data)
- Consistent presentation
- Professional appearance

**Note:** The script preserves existing rewards, so if you've manually added custom rewards for your demo, they'll remain alongside the seeded ones.

### After Development/Testing
If your database has test campaigns or you want fresh campaign data:
```bash
tsx server/seedDemoData.ts
```

This replaces all campaigns and adds any missing sample rewards.

---

## 🎬 Demo Data in Action

### Dashboard Demo
With seeded data, users will see:
- Realistic reward options to browse
- Active campaigns in the offers section
- Varied point costs (50-2000 points)
- Professional images for all rewards

### Rewards Page Demo
- 16 diverse rewards across 4 categories
- Filter by Food, Merchandise, Experiences, Discounts
- Range from affordable (50 points) to premium (2000 points)
- Real stock counts
- Professional product images

### Campaigns Page Demo
- 4 active campaigns with different mechanics
- 1 draft campaign (shows workflow)
- Participation statistics
- Clear start/end dates
- Various target audiences (tier-specific)

---

## 🛠️ Customizing Demo Data

### Editing the Seed Script

**File:** `server/seedDemoData.ts`

**To add a reward:**
```typescript
{
  name: "Your Reward Name",
  description: "Detailed description here",
  pointsCost: 500,
  category: "food", // or merchandise, experiences, discounts
  imageUrl: "https://images.unsplash.com/...",
  isActive: true,
  stock: 50,
}
```

**To add a campaign:**
```typescript
{
  name: "Campaign Name",
  description: "Campaign description",
  type: "bonus_points", // or points_multiplier, tier_upgrade, cashback
  status: "active", // or draft, completed
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  rules: {
    bonusPoints: 100,
  },
  targetAudience: {
    tiers: ["starter", "explorer"],
  },
  currentParticipants: 0,
  maxParticipants: 100,
}
```

**After editing:**
```bash
tsx server/seedDemoData.ts
```

---

## 🖼️ Image URLs

The seed script uses Unsplash images (free to use). All URLs follow this format:
```
https://images.unsplash.com/photo-{id}?w=400
```

**To replace with custom images:**
1. Upload images to your CDN or image hosting
2. Update `imageUrl` values in the seed script
3. Re-run seeding

**Recommended image specs:**
- **Size:** 400x400px minimum
- **Format:** JPEG or PNG
- **Aspect ratio:** Square or 4:3
- **File size:** < 500KB for fast loading

---

## 🧪 Testing After Seeding

### Verification Checklist

After running the seed script:

**Rewards Page (`/rewards`):**
- [ ] All 16 rewards visible
- [ ] Images load correctly
- [ ] Categories filter works (4 categories)
- [ ] Point costs display properly
- [ ] Stock counts show

**Campaigns Page (`/campaigns`):**
- [ ] 4 active campaigns visible
- [ ] 1 draft campaign visible
- [ ] Start/end dates correct
- [ ] Participant counts display
- [ ] Campaign details accurate

**Admin Panel (`/admin`):**
- [ ] Rewards tab shows all 16 items
- [ ] Can edit reward details
- [ ] Can deactivate/activate rewards
- [ ] Campaign management works

**Dashboard (`/dashboard`):**
- [ ] Featured rewards appear
- [ ] Personalized offers show
- [ ] No errors in console

---

## 🚨 Troubleshooting

### Script fails with "table does not exist"
**Solution:** Run database migrations first
```bash
npm run db:push
```

### "Permission denied" error
**Solution:** Check database connection
- Verify `DATABASE_URL` in environment
- Ensure database is accessible

### Rewards don't appear after seeding
**Solution:** Clear React Query cache
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Or restart the application workflow

### Images not loading
**Solution:** Check image URLs
1. Verify URLs are accessible
2. Check browser console for CORS errors
3. Ensure internet connection is active

### Campaign dates seem wrong
**Solution:** Script uses relative dates
- Campaigns are set relative to current date
- Re-run script to update to current date/time

---

## 🔄 Resetting to Clean State

### Campaign Reset (Standard)
```bash
tsx server/seedDemoData.ts
```
- Clears and replaces all campaigns
- Adds new rewards (preserves existing rewards)
- Keeps user accounts and transactions intact
- Safe for demos - won't break redemption history

**Best for:** Refreshing campaign data while keeping everything else

### Complete Database Reset
If you need to clear EVERYTHING (including rewards):
```bash
# WARNING: This deletes ALL data including users, rewards, and redemptions
npm run db:push --force
tsx server/seedDemoData.ts
```

**Use this when:**
- Starting completely fresh
- Too many test rewards cluttering the catalog
- Want to demo with only the 16 seeded rewards
- Database has corrupted or inconsistent data

**Warning:** This nuclear option deletes all user accounts, transactions, redemptions, and rewards. Only use if you're certain!

---

## 📊 Demo Data Statistics

After seeding, your database will have:

**Total Rewards:** 16
- Food & Drinks: 4 (25%)
- Merchandise: 4 (25%)
- Experiences: 4 (25%)
- Discounts: 4 (25%)

**Point Range:** 50 - 2000 points
- Affordable (< 200 points): 5 rewards
- Mid-range (200-500 points): 6 rewards
- Premium (500-1000 points): 3 rewards
- Luxury (1000+ points): 2 rewards

**Total Stock:** 1,051 items
**Total Campaigns:** 5
**Active Campaigns:** 4 (80%)

---

## 💡 Best Practices

### For Demo Presentations

1. **Seed 24 hours before demo**
   - Gives time to verify everything
   - Allows for adjustments if needed

2. **Create demo user accounts**
   - Different tier levels (Starter, Explorer, Champion, Elite)
   - Varied point balances (100, 600, 2000, 5000)
   - Shows tier progression clearly

3. **Prepare sample receipts**
   - Have 3-4 receipt images ready
   - Different purchase types (airtime, accessories, plans)
   - Various amounts for demo variety

4. **Test redemption flow**
   - Verify at least one reward redemption works
   - Check unique code generation
   - Ensure points deduct correctly

5. **Check mobile view**
   - Test on mobile viewport
   - Verify images load fast
   - Confirm touch targets work

---

## 🎯 Demo Day Checklist

**30 Minutes Before:**
- [ ] Run seed script fresh
- [ ] Verify all rewards visible
- [ ] Check campaigns load
- [ ] Test reward redemption
- [ ] Prepare demo user (Explorer tier, 600 points)

**15 Minutes Before:**
- [ ] Clear browser cache
- [ ] Check app is running
- [ ] Have receipt images ready
- [ ] Test mobile viewport
- [ ] Close unnecessary browser tabs

**5 Minutes Before:**
- [ ] Navigate to landing page
- [ ] Take deep breath
- [ ] Review talking points
- [ ] Smile - you've got this! 😊

---

## 📚 Related Documentation

- **Demo Script:** `DEMO_GUIDE.md`
- **Quick Reference:** `DEMO_QUICK_REFERENCE.md`
- **User Guide:** `HOW_TO_GUIDE.md`
- **Client Report:** `CLIENT_FEEDBACK_REPORT.md`

---

**Your demo data is ready! Good luck with your presentation! 🚀**

*Last Updated: November 2025*
