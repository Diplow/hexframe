/**
 * Cleanup all runs from the database.
 *
 * Run with:
 *   pnpm tsx scripts/cleanup-runs.ts
 *   pnpm tsx scripts/cleanup-runs.ts --dry-run
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { pgTableCreator, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const createTable = pgTableCreator((name) => `vde_${name}`);

const runs = createTable(
  "runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    rootCoords: text("root_coords").notNull(),
    status: text("status").notNull(),
    blockageReason: text("blockage_reason"),
    executionLog: jsonb("execution_log").notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userRunsIdx: index("idx_user_runs").on(table.userId, table.status),
    rootCoordsStatusIdx: index("idx_root_coords_status").on(table.rootCoords, table.status),
    uniqueOpenRun: uniqueIndex("unique_open_run").on(table.rootCoords).where(sql`status = 'open'`),
  })
);

const schema = { runs };

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log("━".repeat(70));
  console.log("Runs Cleanup");
  console.log(`Dry Run: ${dryRun ? "Yes (no changes will be made)" : "No (will delete all runs)"}`);
  console.log("━".repeat(70));
  console.log();

  const client = postgres(DATABASE_URL);
  const db = drizzle(client, { schema });

  try {
    const existingRuns = await db.select({ id: runs.id, status: runs.status, rootCoords: runs.rootCoords }).from(runs);

    console.log(`📊 Found ${existingRuns.length} runs in database:\n`);

    const statusCounts = { open: 0, blocked: 0, closed: 0 };
    for (const run of existingRuns) {
      statusCounts[run.status as keyof typeof statusCounts]++;
      console.log(`  - ${run.id}: ${run.status} (${run.rootCoords})`);
    }

    console.log();
    console.log(`  Open: ${statusCounts.open}`);
    console.log(`  Blocked: ${statusCounts.blocked}`);
    console.log(`  Closed: ${statusCounts.closed}`);
    console.log();

    if (existingRuns.length === 0) {
      console.log("✅ No runs to delete.\n");
      return;
    }

    if (dryRun) {
      console.log(`\n✅ [DRY RUN] Would have deleted ${existingRuns.length} runs`);
    } else {
      await db.delete(runs);
      console.log(`\n✅ Deleted ${existingRuns.length} runs`);
    }

    console.log("\n━".repeat(70));

    if (dryRun) {
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
