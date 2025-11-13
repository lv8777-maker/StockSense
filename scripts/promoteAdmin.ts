import { storage } from "../server/storage";

async function promoteUserToAdmin() {
  const email = process.argv[2];
  const role = process.argv[3] || "admin";

  if (!email) {
    console.error("❌ Usage: tsx scripts/promoteAdmin.ts <email> [role]");
    console.error("\nRoles:");
    console.error("  super_admin - Full access including admin management");
    console.error("  admin       - Manage users, rewards, campaigns");
    console.error("  manager     - View-only access to users/rewards/campaigns");
    console.error("  analyst     - Analytics and reporting only");
    console.error("\nExample:");
    console.error("  tsx scripts/promoteAdmin.ts admin@maverick.com super_admin");
    process.exit(1);
  }

  const validRoles = ["super_admin", "admin", "manager", "analyst"];
  if (!validRoles.includes(role)) {
    console.error(`❌ Invalid role: ${role}`);
    console.error(`   Valid roles: ${validRoles.join(", ")}`);
    process.exit(1);
  }

  try {
    console.log(`\n🔍 Looking for user with email: ${email}...`);
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.error(`\n❌ User not found with email: ${email}`);
      console.error("   Please ensure the user has registered in the app first.");
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName}`);
    console.log(`   User ID: ${user.id}`);

    // Check if already an admin
    const existingAdmin = await storage.getAdminByUserId(user.id);
    if (existingAdmin) {
      console.error(`\n❌ User is already an admin with role: ${existingAdmin.role}`);
      console.error(`   Admin ID: ${existingAdmin.id}`);
      
      // Offer to update role
      if (existingAdmin.role !== role) {
        console.log(`\n💡 To update role from ${existingAdmin.role} to ${role}, use updateAdmin script (not yet implemented)`);
      }
      process.exit(1);
    }

    console.log(`\n🎯 Promoting ${email} to ${role}...`);

    // Create admin
    const admin = await storage.createAdminUser({
      userId: user.id,
      email: user.email!,
      role,
      isActive: true,
      createdBy: null, // First admin has no creator
    });

    console.log(`\n✅ Successfully promoted ${email} to ${role}`);
    console.log(`   Admin ID: ${admin.id}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Active: ${admin.isActive}`);
    
    console.log(`\n🎉 ${user.firstName} can now access the admin panel at /admin`);
    console.log(`   They should logout and login again for changes to take effect.`);
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error promoting user:", error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

promoteUserToAdmin();
