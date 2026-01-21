import { nanoid } from "nanoid";
import { RunRepository, type DrizzleClient } from "~/lib/domains/agentic/services/_run-services/_run.repository";
import type { Run, ExecutionLogEntry, ToolCallEntry } from "~/lib/domains/agentic/services/_run-services/_run.types";

export class RunService {
  private readonly repository: RunRepository;

  constructor(db: DrizzleClient) {
    this.repository = new RunRepository(db);
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

  private async _getRunOrThrow(runId: string): Promise<Run> {
    const run = await this.repository.findById(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }
    return run;
  }
}
