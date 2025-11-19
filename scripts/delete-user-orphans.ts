/**
 * Delete orphan map items that reference users that don't exist in the auth table.
 *
 * This script provides options to:
 * 1. Delete orphan items (and their base items if not referenced elsewhere)
 * 2. Reassign orphans to a specific user
 *
 * Run with:
 *   pnpm db:delete-user-orphans
 *   pnpm db:delete-user-orphans --dry-run
 *   pnpm db:delete-user-orphans --reassign=USER_ID
 */

import { eq, and, sql } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { schema } from "~/server/db";

const { mapItems, baseItems } = schema;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

interface UserOrphan {
  id: number;
  coord_user_id: string;
  coord_group_id: number;
  path: string;
  ref_item_id: number;
  title: string;
}

type CleanupMode = "delete" | "reassign";

interface CleanupOptions {
  mode: CleanupMode;
  dryRun: boolean;
  reassignToUserId?: string;
}

async function findUserOrphans(db: ReturnType<typeof drizzle<typeof schema>>) {
  console.log("🔍 Searching for map items with non-existent users...\n");

  // Find all map items that reference non-existent users
  const orphans = await db
    .select({
      id: mapItems.id,
      coord_user_id: mapItems.coord_user_id,
      coord_group_id: mapItems.coord_group_id,
      path: mapItems.path,
      ref_item_id: mapItems.refItemId,
      title: baseItems.title,
    })
    .from(mapItems)
    .leftJoin(sql`users u`, sql`${mapItems.coord_user_id} = u.id`)
    .leftJoin(baseItems, eq(mapItems.refItemId, baseItems.id))
    .where(sql`u.id IS NULL`)
    .orderBy(mapItems.coord_user_id, mapItems.path);

  return orphans as UserOrphan[];
}

async function getUserOrphanSummary(
  db: ReturnType<typeof drizzle<typeof schema>>
) {
  const summary = await db.execute<{
    coord_user_id: string;
    item_count: string;
  }>(sql`
    SELECT
      m.coord_user_id,
      COUNT(*) as item_count
    FROM vde_map_items m
    LEFT JOIN users u ON m.coord_user_id = u.id
    WHERE u.id IS NULL
    GROUP BY m.coord_user_id
    ORDER BY item_count DESC
  `);

  return summary.rows;
}

async function verifyUserExists(
  db: ReturnType<typeof drizzle<typeof schema>>,
  userId: string
): Promise<boolean> {
  const result = await db.execute<{ exists: boolean }>(
    sql`SELECT EXISTS(SELECT 1 FROM users WHERE id = ${userId}) as exists`
  );

  return result.rows[0]?.exists ?? false;
}

async function deleteOrphans(
  db: ReturnType<typeof drizzle<typeof schema>>,
  orphans: UserOrphan[],
  dryRun: boolean
) {
  console.log(
    `\n🗑️  ${dryRun ? "[DRY RUN] Would delete" : "Deleting"} ${orphans.length} orphan items...\n`
  );

  const orphansByUser = new Map<string, UserOrphan[]>();
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
      await db
        .delete(mapItems)
        .where(
          sql`${mapItems.id} IN (${sql.join(
            userOrphans.map((o) => sql`${o.id}`),
            sql`, `
          )})`
        );
    }
  }

  if (!dryRun) {
    console.log(`\n✅ Deleted ${orphans.length} orphan items from ${orphansByUser.size} non-existent users`);
  } else {
    console.log(
      `\n✅ [DRY RUN] Would have deleted ${orphans.length} orphan items from ${orphansByUser.size} non-existent users`
    );
  }
}

async function reassignOrphans(
  db: ReturnType<typeof drizzle<typeof schema>>,
  orphans: UserOrphan[],
  newUserId: string,
  dryRun: boolean
) {
  console.log(
    `\n🔄 ${dryRun ? "[DRY RUN] Would reassign" : "Reassigning"} ${orphans.length} orphan items to user ${newUserId}...\n`
  );

  const orphansByUser = new Map<string, UserOrphan[]>();
  for (const orphan of orphans) {
    const userOrphans = orphansByUser.get(orphan.coord_user_id) ?? [];
    userOrphans.push(orphan);
    orphansByUser.set(orphan.coord_user_id, userOrphans);
  }

  for (const [oldUserId, userOrphans] of orphansByUser) {
    console.log(`  From user ${oldUserId} → ${newUserId}: ${userOrphans.length} items`);

    if (!dryRun) {
      // Reassign all items for this user
      await db
        .update(mapItems)
        .set({ coord_user_id: newUserId })
        .where(
          sql`${mapItems.id} IN (${sql.join(
            userOrphans.map((o) => sql`${o.id}`),
            sql`, `
          )})`
        );
    }
  }

  if (!dryRun) {
    console.log(`\n✅ Reassigned ${orphans.length} orphan items to user ${newUserId}`);
  } else {
    console.log(
      `\n✅ [DRY RUN] Would have reassigned ${orphans.length} orphan items to user ${newUserId}`
    );
  }
}

async function main() {
  const args = process.argv.slice(2);

  const options: CleanupOptions = {
    mode: "delete",
    dryRun: false,
  };

  // Parse arguments
  for (const arg of args) {
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg.startsWith("--reassign=")) {
      const userId = arg.split("=")[1];
      if (!userId) {
        console.error("❌ --reassign requires a user ID");
        process.exit(1);
      }
      options.mode = "reassign";
      options.reassignToUserId = userId;
    }
  }

  console.log("━".repeat(70));
  console.log("User Orphan Map Items Cleanup");
  console.log(`Mode: ${options.mode}`);
  if (options.mode === "reassign") {
    console.log(`Reassign to: ${options.reassignToUserId}`);
  }
  console.log(
    `Dry Run: ${options.dryRun ? "Yes (no changes will be made)" : "No (will modify database)"}`
  );
  console.log("━".repeat(70));
  console.log();

  const client = postgres(DATABASE_URL);
  const db = drizzle(client, { schema });

  try {
    // Verify reassign user exists if in reassign mode
    if (options.mode === "reassign" && options.reassignToUserId) {
      const userExists = await verifyUserExists(db, options.reassignToUserId);
      if (!userExists) {
        console.error(
          `❌ Error: User ${options.reassignToUserId} does not exist in the auth table`
        );
        process.exit(1);
      }
      console.log(`✅ Verified user ${options.reassignToUserId} exists\n`);
    }

    const orphans = await findUserOrphans(db);

    if (orphans.length === 0) {
      console.log("✅ No user orphans found! All map items reference valid users.\n");
      return;
    }

    console.log(
      `⚠️  Found ${orphans.length} map items referencing non-existent users:\n`
    );

    // Show summary
    const summary = await getUserOrphanSummary(db);

    console.log("📋 Summary by orphaned user ID:\n");
    console.log("─".repeat(70));

    for (const userSummary of summary) {
      console.log(`User ID: ${userSummary.coord_user_id}`);
      console.log(`  Total items: ${userSummary.item_count}`);
      console.log();
    }

    console.log("─".repeat(70));

    // Perform cleanup action
    if (options.mode === "delete") {
      await deleteOrphans(db, orphans, options.dryRun);
    } else if (options.mode === "reassign" && options.reassignToUserId) {
      await reassignOrphans(db, orphans, options.reassignToUserId, options.dryRun);
    }

    if (!options.dryRun) {
      console.log("\n🔍 Verifying cleanup...");
      const remainingOrphans = await findUserOrphans(db);
      if (remainingOrphans.length === 0) {
        console.log("✅ All user orphans cleaned up successfully!");
      } else {
        console.warn(`⚠️  ${remainingOrphans.length} user orphans still remain`);
      }
    }

    console.log("\n━".repeat(70));

    if (options.dryRun) {
      console.log("\n💡 This was a dry run. Re-run without --dry-run to apply changes.");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
