import { text, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { createTable } from "~/server/db/schema/_utils";
import { runs } from "~/server/db/schema/_tables/agentic/runs";

/**
 * RunHexplans table - stores hexplan content per run and coords
 *
 * A hexplan tracks execution state for a specific task tile within a run.
 * This allows:
 * - Multiple runs to have independent hexplan state
 * - Historical preservation of execution context
 * - No cleanup needed between runs
 *
 * The coords column stores the tile coordinates in string format (e.g., "userId,0:1,2")
 */
export const runHexplans = createTable(
  "run_hexplans",
  {
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    coords: text("coords").notNull(),
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.runId, table.coords] }),
    runIdIdx: index("idx_run_hexplans_run_id").on(table.runId),
  })
);

export type RunHexplan = typeof runHexplans.$inferSelect;
export type NewRunHexplan = typeof runHexplans.$inferInsert;
