import { eq, and } from "drizzle-orm";
import { schema } from "~/server/db";
import type { DrizzleClient } from "~/lib/domains/agentic/services/_run-services/_run.repository";
import type { RunHexplan } from "~/lib/domains/agentic/services/_run-services/_run.types";

const { runHexplans } = schema;

type DbRunHexplan = typeof runHexplans.$inferSelect;

function _mapDbToRunHexplan(dbHexplan: DbRunHexplan): RunHexplan {
  return {
    runId: dbHexplan.runId,
    coords: dbHexplan.coords,
    content: dbHexplan.content,
    createdAt: dbHexplan.createdAt,
    updatedAt: dbHexplan.updatedAt,
  };
}

export class RunHexplanRepository {
  constructor(private readonly db: DrizzleClient) {}

  async findByRunAndCoords(
    runId: string,
    coords: string
  ): Promise<RunHexplan | null> {
    const result = await this.db.query.runHexplans.findFirst({
      where: and(
        eq(runHexplans.runId, runId),
        eq(runHexplans.coords, coords)
      ),
    });

    return result ? _mapDbToRunHexplan(result) : null;
  }

  async findAllByRunId(runId: string): Promise<RunHexplan[]> {
    const results = await this.db
      .select()
      .from(runHexplans)
      .where(eq(runHexplans.runId, runId));

    return results.map(_mapDbToRunHexplan);
  }

  async upsert(runId: string, coords: string, content: string): Promise<RunHexplan> {
    const [result] = await this.db
      .insert(runHexplans)
      .values({
        runId,
        coords,
        content,
      })
      .onConflictDoUpdate({
        target: [runHexplans.runId, runHexplans.coords],
        set: {
          content,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!result) {
      throw new Error(`Failed to upsert run hexplan: ${runId}, ${coords}`);
    }

    return _mapDbToRunHexplan(result);
  }

  async delete(runId: string, coords: string): Promise<void> {
    await this.db
      .delete(runHexplans)
      .where(
        and(eq(runHexplans.runId, runId), eq(runHexplans.coords, coords))
      );
  }
}
