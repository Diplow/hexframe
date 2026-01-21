import { eq, and, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { schema } from "~/server/db";
import type { Run, ExecutionLogEntry, RunStatus } from "~/lib/domains/agentic/services/_run-services/_run.types";

const { runs } = schema;

export type DrizzleClient = PostgresJsDatabase<typeof schema>;

type DbRun = typeof runs.$inferSelect;

function _mapDbRunToRun(dbRun: DbRun): Run {
  return {
    id: dbRun.id,
    userId: dbRun.userId,
    rootCoords: dbRun.rootCoords,
    status: dbRun.status as RunStatus,
    blockageReason: dbRun.blockageReason,
    executionLog: dbRun.executionLog as ExecutionLogEntry[],
    createdAt: dbRun.createdAt,
    updatedAt: dbRun.updatedAt,
  };
}

export class RunRepository {
  constructor(private readonly db: DrizzleClient) {}

  async findById(id: string): Promise<Run | null> {
    const result = await this.db.query.runs.findFirst({
      where: eq(runs.id, id),
    });

    return result ? _mapDbRunToRun(result) : null;
  }

  async findOpenByRootCoords(rootCoords: string): Promise<Run | null> {
    const result = await this.db.query.runs.findFirst({
      where: and(eq(runs.rootCoords, rootCoords), eq(runs.status, "open")),
    });

    return result ? _mapDbRunToRun(result) : null;
  }

  async findResumableByRootCoords(rootCoords: string): Promise<Run | null> {
    const result = await this.db.query.runs.findFirst({
      where: and(
        eq(runs.rootCoords, rootCoords),
        or(eq(runs.status, "open"), eq(runs.status, "blocked"))
      ),
    });

    return result ? _mapDbRunToRun(result) : null;
  }

  async create(data: {
    id: string;
    userId: string;
    rootCoords: string;
    status: RunStatus;
    executionLog: ExecutionLogEntry[];
  }): Promise<Run> {
    const [result] = await this.db
      .insert(runs)
      .values({
        id: data.id,
        userId: data.userId,
        rootCoords: data.rootCoords,
        status: data.status,
        executionLog: data.executionLog,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to create run");
    }

    return _mapDbRunToRun(result);
  }

  async update(
    id: string,
    data: Partial<{
      status: RunStatus;
      blockageReason: string | null;
      executionLog: ExecutionLogEntry[];
    }>
  ): Promise<Run> {
    const [result] = await this.db
      .update(runs)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(runs.id, id))
      .returning();

    if (!result) {
      throw new Error(`Failed to update run: ${id}`);
    }

    return _mapDbRunToRun(result);
  }
}
