import { nanoid } from "nanoid";
import { RunRepository, type DrizzleClient } from "~/lib/domains/agentic/services/_run-services/_run.repository";
import { RunHexplanRepository } from "~/lib/domains/agentic/services/_run-services/_run-hexplan.repository";
import type { Run, ExecutionLogEntry, ToolCallEntry, RunStatus, RunHexplan } from "~/lib/domains/agentic/services/_run-services/_run.types";

export class RunService {
  private readonly repository: RunRepository;
  private readonly hexplanRepository: RunHexplanRepository;

  constructor(db: DrizzleClient) {
    this.repository = new RunRepository(db);
    this.hexplanRepository = new RunHexplanRepository(db);
  }

  async getOrCreateRun(userId: string, rootCoords: string): Promise<Run> {
    const existingRun = await this.repository.findResumableByRootCoords(rootCoords);
    if (existingRun) {
      // If the run was blocked, resume it automatically
      if (existingRun.status === "blocked") {
        return this.repository.update(existingRun.id, {
          status: "open",
          blockageReason: null,
        });
      }
      return existingRun;
    }

    return this.repository.create({
      id: nanoid(),
      userId,
      rootCoords,
      status: "open",
      executionLog: [],
    });
  }

  async getResumableRun(rootCoords: string): Promise<Run | null> {
    return this.repository.findResumableByRootCoords(rootCoords);
  }

  async getRunById(runId: string): Promise<Run | null> {
    return this.repository.findById(runId);
  }

  async listRunsForUser(
    userId: string,
    options: {
      statusFilter?: RunStatus[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Run[]> {
    const {
      statusFilter = ["open", "blocked"],
      limit = 20,
      offset = 0,
    } = options;

    return this.repository.findByUserId(userId, statusFilter, limit, offset);
  }

  async startStep(
    runId: string,
    stepCoords: string,
    stepTitle?: string,
    hexecutePrompt?: string
  ): Promise<Run> {
    const run = await this._getRunOrThrow(runId);

    const newEntry: ExecutionLogEntry = {
      stepCoords,
      stepTitle,
      status: "completed",
      startedAt: new Date().toISOString(),
      hexecutePrompt,
    };

    return this.repository.update(runId, {
      executionLog: [...run.executionLog, newEntry],
    });
  }

  async markStepCompleted(
    runId: string,
    stepCoords: string,
    agentResponse?: string,
    hexplanContent?: string,
    toolCalls?: ToolCallEntry[]
  ): Promise<Run> {
    const run = await this._getRunOrThrow(runId);

    const updatedLog = run.executionLog.map((entry) => {
      if (entry.stepCoords === stepCoords) {
        return {
          ...entry,
          status: "completed" as const,
          completedAt: new Date().toISOString(),
          agentResponse,
          hexplanContent,
          toolCalls,
        };
      }
      return entry;
    });

    return this.repository.update(runId, {
      executionLog: updatedLog,
    });
  }

  async markStepBlocked(
    runId: string,
    stepCoords: string,
    reason: string,
    agentResponse?: string,
    hexplanContent?: string,
    toolCalls?: ToolCallEntry[]
  ): Promise<Run> {
    const run = await this._getRunOrThrow(runId);

    const updatedLog = run.executionLog.map((entry) => {
      if (entry.stepCoords === stepCoords) {
        return {
          ...entry,
          status: "blocked" as const,
          blockageReason: reason,
          agentResponse,
          hexplanContent,
          toolCalls,
        };
      }
      return entry;
    });

    return this.repository.update(runId, {
      status: "blocked",
      blockageReason: reason,
      executionLog: updatedLog,
    });
  }

  async closeRun(runId: string): Promise<Run> {
    await this._getRunOrThrow(runId);
    return this.repository.update(runId, { status: "closed" });
  }

  async reopenRun(runId: string): Promise<Run> {
    const run = await this._getRunOrThrow(runId);

    if (run.status !== "closed") {
      throw new Error(`Cannot reopen run ${runId}: status is ${run.status}, expected 'closed'`);
    }

    return this.repository.update(runId, { status: "open" });
  }

  async resumeBlockedRun(runId: string): Promise<Run> {
    const run = await this._getRunOrThrow(runId);

    if (run.status !== "blocked") {
      throw new Error(`Cannot resume run ${runId}: status is ${run.status}, expected 'blocked'`);
    }

    return this.repository.update(runId, {
      status: "open",
      blockageReason: null,
    });
  }

  // Hexplan methods

  async getHexplan(runId: string, coords: string): Promise<string | null> {
    const hexplan = await this.hexplanRepository.findByRunAndCoords(runId, coords);
    return hexplan?.content ?? null;
  }

  async setHexplan(runId: string, coords: string, content: string): Promise<RunHexplan> {
    return this.hexplanRepository.upsert(runId, coords, content);
  }

  async getHexplansForRun(runId: string): Promise<Map<string, string>> {
    const hexplans = await this.hexplanRepository.findAllByRunId(runId);
    const hexplanMap = new Map<string, string>();
    for (const hexplan of hexplans) {
      hexplanMap.set(hexplan.coords, hexplan.content);
    }
    return hexplanMap;
  }

  async getActiveRunForCoords(coords: string): Promise<Run | null> {
    // Find any open or blocked run where rootCoords matches or is an ancestor of coords
    // For now, simple exact match - can be extended for ancestry check if needed
    return this.repository.findResumableByRootCoords(coords);
  }

  private async _getRunOrThrow(runId: string): Promise<Run> {
    const run = await this.repository.findById(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }
    return run;
  }
}
