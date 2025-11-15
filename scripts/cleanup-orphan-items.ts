/**
 * Cleanup orphan map items that don't have a valid ancestry path to a root item.
 *
 * This script provides options to:
 * 1. Delete orphan items (and their base items if not referenced elsewhere)
 * 2. Re-parent orphans to root (convert them to root items)
 *
 * Run with:
 *   pnpm db:cleanup-orphans
 *   pnpm db:cleanup-orphans --mode=delete
 *   pnpm db:cleanup-orphans --mode=reparent
 *   pnpm db:cleanup-orphans --dry-run
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

interface OrphanItem {
  id: number;
  coord_user_id: number;
  coord_group_id: number;
  path: string;
  parent_id: number | null;
  ref_item_id: number;
  expectedParentPath: string;
  reason: string;
}

type CleanupMode = "delete" | "reparent";

interface CleanupOptions {
  mode: CleanupMode;
  dryRun: boolean;
}

async function findOrphanItems(db: ReturnType<typeof drizzle<typeof schema>>) {
  console.log("🔍 Searching for orphan items...\n");

  // Get all non-root items
  const allItems = await db
    .select({
      id: mapItems.id,
      coord_user_id: mapItems.coord_user_id,
      coord_group_id: mapItems.coord_group_id,
      path: mapItems.path,
      parent_id: mapItems.parentId,
      ref_item_id: mapItems.refItemId,
    })
    .from(mapItems)
    .where(sql`${mapItems.path} != '' AND ${mapItems.path} IS NOT NULL`)
    .orderBy(mapItems.coord_user_id, mapItems.coord_group_id, mapItems.path);

  console.log(`📊 Found ${allItems.length} non-root items to check\n`);

  const orphans: OrphanItem[] = [];

  for (const item of allItems) {
    // Calculate what the parent path should be
    const pathParts = item.path.split(",").filter(Boolean);
    if (pathParts.length === 0) continue;

    const parentPathParts = pathParts.slice(0, -1);
    const expectedParentPath = parentPathParts.join(",");

    // Check if parent exists
    const parentExists = await db
      .select({ id: mapItems.id })
      .from(mapItems)
      .where(
        and(
          eq(mapItems.coord_user_id, item.coord_user_id),
          eq(mapItems.coord_group_id, item.coord_group_id),
          eq(mapItems.path, expectedParentPath)
        )
      )
      .limit(1);

    if (parentExists.length === 0) {
      let reason = `Parent path "${expectedParentPath}" does not exist`;

      // Check if root exists
      const rootExists = await db
        .select({ id: mapItems.id })
        .from(mapItems)
        .where(
          and(
            eq(mapItems.coord_user_id, item.coord_user_id),
            eq(mapItems.coord_group_id, item.coord_group_id),
            eq(mapItems.path, "")
          )
        )
        .limit(1);

      if (rootExists.length === 0) {
        reason += " (no root item exists for this user/group)";
      }

      orphans.push({
        ...item,
        expectedParentPath,
        reason,
      });
    }
  }

  return orphans;
}

async function getBaseItemInfo(
  db: ReturnType<typeof drizzle<typeof schema>>,
  orphanIds: number[]
) {
  if (orphanIds.length === 0) return [];

  return db
    .select({
      base_item_id: baseItems.id,
      title: baseItems.title,
      content: baseItems.content,
      map_item_id: mapItems.id,
    })
    .from(baseItems)
    .innerJoin(mapItems, eq(baseItems.id, mapItems.refItemId))
    .where(sql`${mapItems.id} = ANY(${orphanIds})`);
}

async function deleteOrphans(
  db: ReturnType<typeof drizzle<typeof schema>>,
  orphans: OrphanItem[],
  dryRun: boolean
) {
  console.log(`\n🗑️  ${dryRun ? "[DRY RUN] Would delete" : "Deleting"} ${orphans.length} orphan items...\n`);

  for (const orphan of orphans) {
    console.log(`  - Item ${orphan.id} at path "${orphan.path}"`);

    if (!dryRun) {
      await db.delete(mapItems).where(eq(mapItems.id, orphan.id));
    }
  }

  if (!dryRun) {
    console.log(`\n✅ Deleted ${orphans.length} orphan items`);
  } else {
    console.log(`\n✅ [DRY RUN] Would have deleted ${orphans.length} orphan items`);
  }
}

async function reparentOrphans(
  db: ReturnType<typeof drizzle<typeof schema>>,
  orphans: OrphanItem[],
  dryRun: boolean
) {
  console.log(`\n🔄 ${dryRun ? "[DRY RUN] Would re-parent" : "Re-parenting"} ${orphans.length} orphan items to root...\n`);

  for (const orphan of orphans) {
    console.log(`  - Item ${orphan.id}: "${orphan.path}" → "" (root)`);

    if (!dryRun) {
      await db
        .update(mapItems)
        .set({
          path: "",
          parentId: null,
        })
        .where(eq(mapItems.id, orphan.id));
    }
  }

  if (!dryRun) {
    console.log(`\n✅ Re-parented ${orphans.length} orphan items to root`);
  } else {
    console.log(`\n✅ [DRY RUN] Would have re-parented ${orphans.length} orphan items to root`);
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
    } else if (arg.startsWith("--mode=")) {
      const mode = arg.split("=")[1] as CleanupMode;
      if (mode !== "delete" && mode !== "reparent") {
        console.error(`❌ Invalid mode: ${mode}. Use --mode=delete or --mode=reparent`);
        process.exit(1);
      }
      options.mode = mode;
    }
  }

  console.log("━".repeat(70));
  console.log("Orphan Map Items Cleanup");
  console.log(`Mode: ${options.mode}`);
  console.log(`Dry Run: ${options.dryRun ? "Yes (no changes will be made)" : "No (will modify database)"}`);
  console.log("━".repeat(70));
  console.log();

  const client = postgres(DATABASE_URL);
  const db = drizzle(client, { schema });

  try {
    const orphans = await findOrphanItems(db);

    if (orphans.length === 0) {
      console.log("✅ No orphan items found! All items have valid ancestry.\n");
      return;
    }

    console.log(`⚠️  Found ${orphans.length} orphan items:\n`);

    for (const orphan of orphans) {
      console.log("─".repeat(70));
      console.log(`Orphan ID: ${orphan.id}`);
      console.log(`  Coordinates: userId=${orphan.coord_user_id}, groupId=${orphan.coord_group_id}`);
      console.log(`  Path: "${orphan.path}"`);
      console.log(`  Expected parent path: "${orphan.expectedParentPath}"`);
      console.log(`  Parent ID (stored): ${orphan.parent_id ?? "NULL"}`);
      console.log(`  Reason: ${orphan.reason}`);
      console.log();
    }

    console.log("─".repeat(70));

    // Show base item info
    const baseItemInfo = await getBaseItemInfo(
      db,
      orphans.map((o) => o.id)
    );

    if (baseItemInfo.length > 0) {
      console.log(`\n📝 Base items that will be affected:\n`);
      for (const info of baseItemInfo) {
        console.log(`  - Base Item ${info.base_item_id}: "${info.title}"`);
        if (info.content) {
          const preview = info.content.substring(0, 100);
          console.log(`    Preview: ${preview}${info.content.length > 100 ? "..." : ""}`);
        }
      }
      console.log();
    }

    // Perform cleanup action
    if (options.mode === "delete") {
      await deleteOrphans(db, orphans, options.dryRun);
    } else {
      await reparentOrphans(db, orphans, options.dryRun);
    }

    if (!options.dryRun) {
      console.log("\n🔍 Verifying cleanup...");
      const remainingOrphans = await findOrphanItems(db);
      if (remainingOrphans.length === 0) {
        console.log("✅ All orphans cleaned up successfully!");
      } else {
        console.warn(`⚠️  ${remainingOrphans.length} orphans still remain`);
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
