/**
 * Find orphan map items that reference users that don't exist in the auth table.
 *
 * A user orphan is a map item where:
 * 1. The coord_user_id doesn't exist in the users (auth) table
 * 2. Therefore the item belongs to a non-existent user
 *
 * This can happen when:
 * - Users are deleted but their map items remain
 * - Data migration issues
 * - Testing data not properly cleaned up
 *
 * Run with: pnpm tsx scripts/find-user-orphans.ts
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

interface UserOrphan {
  id: number;
  coord_user_id: string;
  coord_group_id: number;
  path: string;
  ref_item_id: number;
  title: string;
  itemCount: number;
}

async function findUserOrphans(): Promise<UserOrphan[]> {
  console.log("🔍 Searching for map items with non-existent users...\n");

  // Find all map items that reference non-existent users
  const orphans = await sql<UserOrphan[]>`
    SELECT
      m.id,
      m.coord_user_id,
      m.coord_group_id,
      m.path,
      m.ref_item_id,
      bi.title,
      COUNT(*) OVER (PARTITION BY m.coord_user_id) as "itemCount"
    FROM vde_map_items m
    LEFT JOIN users u ON m.coord_user_id = u.id
    LEFT JOIN vde_base_items bi ON m.ref_item_id = bi.id
    WHERE u.id IS NULL
    ORDER BY m.coord_user_id, m.path
  `;

  return orphans;
}

async function getUserOrphanSummary() {
  console.log("📊 Getting summary statistics...\n");

  const summary = await sql<
    Array<{
      coord_user_id: string;
      item_count: string;
      root_count: string;
      child_count: string;
    }>
  >`
    SELECT
      m.coord_user_id,
      COUNT(*) as item_count,
      COUNT(CASE WHEN m.path = '' THEN 1 END) as root_count,
      COUNT(CASE WHEN m.path != '' THEN 1 END) as child_count
    FROM vde_map_items m
    LEFT JOIN users u ON m.coord_user_id = u.id
    WHERE u.id IS NULL
    GROUP BY m.coord_user_id
    ORDER BY item_count DESC
  `;

  return summary;
}

async function main() {
  console.log("━".repeat(70));
  console.log("User Orphan Map Items Detection");
  console.log("━".repeat(70));
  console.log();

  try {
    const orphans = await findUserOrphans();

    if (orphans.length === 0) {
      console.log("✅ No user orphans found! All map items reference valid users.\n");
    } else {
      console.log(`⚠️  Found ${orphans.length} map items referencing non-existent users:\n`);

      // Show summary by user
      const summary = await getUserOrphanSummary();

      console.log("📋 Summary by orphaned user ID:\n");
      console.log("─".repeat(70));

      for (const userSummary of summary) {
        console.log(`User ID: ${userSummary.coord_user_id}`);
        console.log(`  Total items: ${userSummary.item_count}`);
        console.log(`  Root items: ${userSummary.root_count}`);
        console.log(`  Child items: ${userSummary.child_count}`);
        console.log();
      }

      console.log("─".repeat(70));
      console.log("\n📝 First 20 orphaned items (detailed):\n");
      console.log("─".repeat(70));

      for (const orphan of orphans.slice(0, 20)) {
        console.log(`Item ID: ${orphan.id}`);
        console.log(`  User ID: ${orphan.coord_user_id} (NON-EXISTENT)`);
        console.log(`  Path: "${orphan.path}" ${orphan.path === "" ? "(ROOT)" : ""}`);
        console.log(`  Title: "${orphan.title}"`);
        console.log(`  Total items for this user: ${orphan.itemCount}`);
        console.log();
      }

      if (orphans.length > 20) {
        console.log(`... and ${orphans.length - 20} more\n`);
      }

      console.log("─".repeat(70));
      console.log();
      console.log("🔧 Suggested actions:");
      console.log("  1. Review the orphan items above");
      console.log("  2. Determine if they should be:");
      console.log("     a) Deleted (if the user is truly gone)");
      console.log("     b) Reassigned to another user");
      console.log("     c) Keep if user might be restored");
      console.log();
      console.log("  To delete these orphans, run:");
      console.log("    pnpm db:delete-user-orphans");
      console.log("    pnpm db:delete-user-orphans --dry-run  # To preview changes");
      console.log();
    }

    console.log("━".repeat(70));
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();