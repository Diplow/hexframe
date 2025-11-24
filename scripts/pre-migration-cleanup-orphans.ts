/**
 * Pre-migration cleanup script to delete map items with no corresponding user_mapping entry.
 *
 * This script is designed to run BEFORE migration 0010 (convert_userid_to_text).
 * It works with the OLD schema where coord_user_id is an integer.
 *
 * Run with:
 *   pnpm db:pre-migration-cleanup
 *   pnpm db:pre-migration-cleanup --dry-run
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

interface OrphanItem {
  id: number;
  coord_user_id: number;
  coord_group_id: number;
  path: string;
  title: string;
}

async function findOrphans(client: postgres.Sql) {
  console.log("🔍 Searching for map items with no user_mapping entry...\n");

  // Find all map items that have no corresponding user_mapping entry
  // Note: coord_user_id is still INTEGER at this point (pre-migration)
  const orphans = await client<OrphanItem[]>`
    SELECT
      m.id,
      m.coord_user_id,
      m.coord_group_id,
      m.path,
      b.title
    FROM vde_map_items m
    LEFT JOIN vde_base_items b ON m.ref_item_id = b.id
    LEFT JOIN vde_user_mapping um ON m.coord_user_id = um.mapping_user_id
    WHERE um.mapping_user_id IS NULL
    ORDER BY m.coord_user_id, m.path
  `;

  return orphans;
}

async function getOrphanSummary(client: postgres.Sql) {
  const summary = await client<{
    coord_user_id: number;
    item_count: string;
  }[]>`
    SELECT
      m.coord_user_id,
      COUNT(*) as item_count
    FROM vde_map_items m
    LEFT JOIN vde_user_mapping um ON m.coord_user_id = um.mapping_user_id
    WHERE um.mapping_user_id IS NULL
    GROUP BY m.coord_user_id
    ORDER BY item_count DESC
  `;

  return summary;
}

async function deleteOrphans(
  client: postgres.Sql,
  orphans: OrphanItem[],
  dryRun: boolean
) {
  console.log(
    `\n🗑️  ${dryRun ? "[DRY RUN] Would delete" : "Deleting"} ${orphans.length} orphan items...\n`
  );

  const orphansByUser = new Map<number, OrphanItem[]>();
  for (const orphan of orphans) {
    const userOrphans = orphansByUser.get(orphan.coord_user_id) ?? [];
    userOrphans.push(orphan);
    orphansByUser.set(orphan.coord_user_id, userOrphans);
  }

  for (const [userId, userOrphans] of orphansByUser) {
    console.log(`  User ID ${userId}: ${userOrphans.length} items`);
    for (const orphan of userOrphans) {
      console.log(`    - Item ${orphan.id}: "${orphan.title}" at path "${orphan.path}"`);
    }
    console.log();

    if (!dryRun) {
      // Delete all items for this user in one batch
      const itemIds = userOrphans.map((o) => o.id);
      await client`
        DELETE FROM vde_map_items
        WHERE id = ANY(${itemIds})
      `;
    }
  }

  if (!dryRun) {
    console.log(`\n✅ Deleted ${orphans.length} orphan items from ${orphansByUser.size} unmapped users`);
  } else {
    console.log(
      `\n✅ [DRY RUN] Would have deleted ${orphans.length} orphan items from ${orphansByUser.size} unmapped users`
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log("━".repeat(70));
  console.log("Pre-Migration User Orphan Cleanup");
  console.log("(Works with OLD schema: coord_user_id as INTEGER)");
  console.log(
    `Dry Run: ${dryRun ? "Yes (no changes will be made)" : "No (will modify database)"}`
  );
  console.log("━".repeat(70));
  console.log();

  const client = postgres(DATABASE_URL);

  try {
    const orphans = await findOrphans(client);

    if (orphans.length === 0) {
      console.log("✅ No orphans found! All map items have corresponding user_mapping entries.\n");
      return;
    }

    console.log(
      `⚠️  Found ${orphans.length} map items with no user_mapping entry:\n`
    );

    // Show summary
    const summary = await getOrphanSummary(client);

    console.log("📋 Summary by unmapped user ID:\n");
    console.log("─".repeat(70));

    for (const userSummary of summary) {
      console.log(`User ID: ${userSummary.coord_user_id}`);
      console.log(`  Total items: ${userSummary.item_count}`);
      console.log();
    }

    console.log("─".repeat(70));

    await deleteOrphans(client, orphans, dryRun);

    if (!dryRun) {
      console.log("\n🔍 Verifying cleanup...");
      const remainingOrphans = await findOrphans(client);
      if (remainingOrphans.length === 0) {
        console.log("✅ All orphans cleaned up successfully!");
      } else {
        console.warn(`⚠️  ${remainingOrphans.length} orphans still remain`);
      }
    }

    console.log("\n━".repeat(70));

    if (dryRun) {
      console.log("\n💡 This was a dry run. Re-run without --dry-run to apply changes.");
      console.log("💡 After cleanup, you can safely run: pnpm db:migrate");
    } else {
      console.log("\n✅ Database is ready for migration 0010");
      console.log("💡 You can now run: pnpm db:migrate");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();