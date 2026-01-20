import { text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createTable } from "~/server/db/schema/_utils";

/**
 * Runs table - tracks execution state of SYSTEM tiles
 *
 * A "run" represents an autonomous execution session for a task hierarchy.
 * Only one open run can exist per rootCoords at any time.
 *
 * Status lifecycle:
 * - open: Execution in progress
 * - blocked: Execution paused due to an error or human intervention needed
 * - closed: Execution completed or terminated
 */
export const runs = createTable(
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
    rootCoordsStatusIdx: index("idx_root_coords_status").on(
      table.rootCoords,
      table.status
    ),
    uniqueOpenRun: uniqueIndex("unique_open_run")
      .on(table.rootCoords)
      .where(sql`status = 'open'`),
  })
);

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
