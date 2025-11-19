/**
 * Find orphan map items that don't have a valid ancestry path to a root item.
 *
 * An orphan item is one where:
 * 1. It has a non-empty path (not a root item itself)
 * 2. Its parent path doesn't exist in the database
 * 3. Therefore it can't be reached by traversing from any root
 *
 * Run with: pnpm tsx scripts/find-orphan-items.ts
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

interface MapItem {
  id: number;
  coord_user_id: number;
  coord_group_id: number;
  path: string;
  parent_id: number | null;
  ref_item_id: number;
}

interface OrphanItem extends MapItem {
  expectedParentPath: string;
  reason: string;
}

async function findOrphanItems(): Promise<OrphanItem[]> {
  console.log("🔍 Searching for orphan items...\n");

  // Get all non-root items (items with non-empty paths)
  const allItems = await sql<MapItem[]>`
    SELECT
      id,
      coord_user_id,
      coord_group_id,
      path,
      parent_id,
      ref_item_id
    FROM vde_map_items
    WHERE path != '' AND path IS NOT NULL
    ORDER BY coord_user_id, coord_group_id, path
  `;

  console.log(`📊 Found ${allItems.length} non-root items to check\n`);

  const orphans: OrphanItem[] = [];

  for (const item of allItems) {
    // Calculate what the parent path should be
    const pathParts = item.path.split(",").filter(Boolean);
    if (pathParts.length === 0) continue; // Skip root items

    // Parent path is all but the last direction
    const parentPathParts = pathParts.slice(0, -1);
    const expectedParentPath = parentPathParts.join(",");

    // Check if parent exists
    const parentExists = await sql<Array<{ exists: boolean }>>`
      SELECT EXISTS(
        SELECT 1
        FROM vde_map_items
        WHERE coord_user_id = ${item.coord_user_id}
          AND coord_group_id = ${item.coord_group_id}
          AND path = ${expectedParentPath}
      ) as exists
    `;

    if (!parentExists[0]?.exists) {
      let reason = `Parent path "${expectedParentPath}" does not exist`;

      // Additional check: Is there a root for this user/group?
      const rootExists = await sql<Array<{ exists: boolean }>>`
        SELECT EXISTS(
          SELECT 1
          FROM vde_map_items
          WHERE coord_user_id = ${item.coord_user_id}
            AND coord_group_id = ${item.coord_group_id}
            AND path = ''
        ) as exists
      `;

      if (!rootExists[0]?.exists) {
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

async function checkAncestryToRoot(
  item: MapItem
): Promise<{ hasRoot: boolean; brokenAt?: string }> {
  let currentPath = item.path;
  const visited = new Set<string>();

  while (currentPath !== "") {
    if (visited.has(currentPath)) {
      return { hasRoot: false, brokenAt: "circular reference detected" };
    }
    visited.add(currentPath);

    const pathParts = currentPath.split(",").filter(Boolean);
    if (pathParts.length === 0) break;

    const parentPath = pathParts.slice(0, -1).join(",");

    // Check if parent exists
    const parent = await sql<MapItem[]>`
      SELECT path
      FROM vde_map_items
      WHERE coord_user_id = ${item.coord_user_id}
        AND coord_group_id = ${item.coord_group_id}
        AND path = ${parentPath}
      LIMIT 1
    `;

    if (parent.length === 0) {
      return { hasRoot: false, brokenAt: parentPath || "(root)" };
    }

    currentPath = parent[0]!.path;
  }

  return { hasRoot: true };
}

async function main() {
  console.log("━".repeat(70));
  console.log("Orphan Map Items Detection");
  console.log("━".repeat(70));
  console.log();

  try {
    const orphans = await findOrphanItems();

    if (orphans.length === 0) {
      console.log("✅ No orphan items found! All items have valid ancestry.\n");
    } else {
      console.log(`⚠️  Found ${orphans.length} orphan items:\n`);

      for (const orphan of orphans) {
        console.log("─".repeat(70));
        console.log(`Orphan ID: ${orphan.id}`);
        console.log(`  Coordinates: userId=${orphan.coord_user_id}, groupId=${orphan.coord_group_id}`);
        console.log(`  Path: "${orphan.path}"`);
        console.log(`  Expected parent path: "${orphan.expectedParentPath}"`);
        console.log(`  Parent ID (stored): ${orphan.parent_id ?? "NULL"}`);
        console.log(`  Reason: ${orphan.reason}`);

        // Check full ancestry
        const ancestry = await checkAncestryToRoot(orphan);
        if (!ancestry.hasRoot) {
          console.log(`  ❌ No valid path to root (broken at: ${ancestry.brokenAt})`);
        }
        console.log();
      }

      console.log("─".repeat(70));
      console.log();
      console.log("🔧 Suggested actions:");
      console.log("  1. Review the orphan items above");
      console.log("  2. Determine if they should be:");
      console.log("     a) Deleted (if they're truly invalid)");
      console.log("     b) Re-parented (if parent was accidentally deleted)");
      console.log("     c) Converted to root items (set path to empty string)");
      console.log();
      console.log("⚠️  Example cleanup SQL (review before running):");
      console.log();
      orphans.forEach((orphan) => {
        console.log(`  -- Delete orphan ${orphan.id}:`);
        console.log(`  DELETE FROM vde_map_items WHERE id = ${orphan.id};`);
        console.log();
      });
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
