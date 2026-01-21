import { describe, beforeEach, it, expect } from "vitest";
import { db } from "~/server/db";
import { sql } from "drizzle-orm";
import { RunService } from "~/lib/domains/agentic/services/_run-services";

const TEST_USER_ID = "test-user-run-service";

let testRunCounter = 0;

function createUniqueTestParams() {
  const counter = testRunCounter++;
  const timestamp = Date.now();
  return {
    userId: `${TEST_USER_ID}-${timestamp}-${counter}`,
    rootCoords: `${TEST_USER_ID}-${timestamp}-${counter},0:1`,
  };
}

async function cleanupTestRuns() {
  try {
    await db.execute(sql`DELETE FROM vde_runs WHERE user_id LIKE ${`${TEST_USER_ID}%`}`);
  } catch {
    // Table might not exist yet
  }
}

describe("RunService [Integration - DB]", () => {
  let runService: RunService;

  beforeEach(async () => {
    await cleanupTestRuns();
    runService = new RunService(db);
  });

  describe("getOrCreateRun", () => {
    it("creates new run when no open run exists", async () => {
      const { userId, rootCoords } = createUniqueTestParams();

      const run = await runService.getOrCreateRun(userId, rootCoords);

      expect(run).toBeDefined();
      expect(run.id).toBeDefined();
      expect(run.userId).toBe(userId);
      expect(run.rootCoords).toBe(rootCoords);
      expect(run.status).toBe("open");
    });

    it("returns existing open run for same rootCoords", async () => {
      const { userId, rootCoords } = createUniqueTestParams();

      const run1 = await runService.getOrCreateRun(userId, rootCoords);
      const run2 = await runService.getOrCreateRun(userId, rootCoords);

      expect(run1.id).toBe(run2.id);
    });

    it("creates new run if previous run is closed", async () => {
      const { userId, rootCoords } = createUniqueTestParams();

      const run1 = await runService.getOrCreateRun(userId, rootCoords);
      await runService.closeRun(run1.id);
      const run2 = await runService.getOrCreateRun(userId, rootCoords);

      expect(run1.id).not.toBe(run2.id);
      expect(run2.status).toBe("open");
    });

    it("resumes blocked run instead of creating new one", async () => {
      const { userId, rootCoords } = createUniqueTestParams();

      const run1 = await runService.getOrCreateRun(userId, rootCoords);
      await runService.startStep(run1.id, `${rootCoords},1`);
      await runService.markStepBlocked(run1.id, `${rootCoords},1`, "Test block");
      const run2 = await runService.getOrCreateRun(userId, rootCoords);

      // Should return the same run, now resumed
      expect(run1.id).toBe(run2.id);
      expect(run2.status).toBe("open");
      expect(run2.blockageReason).toBeNull();
    });

    it("sets initial status to open", async () => {
      const { userId, rootCoords } = createUniqueTestParams();

      const run = await runService.getOrCreateRun(userId, rootCoords);

      expect(run.status).toBe("open");
    });

    it("initializes executionLog as empty array", async () => {
      const { userId, rootCoords } = createUniqueTestParams();

      const run = await runService.getOrCreateRun(userId, rootCoords);

      expect(run.executionLog).toEqual([]);
    });
  });

  describe("getOpenRun", () => {
    it("returns null when no open run exists", async () => {
      const { rootCoords } = createUniqueTestParams();

      const run = await runService.getOpenRun(rootCoords);

      expect(run).toBeNull();
    });

    it("returns open run for rootCoords", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const created = await runService.getOrCreateRun(userId, rootCoords);

      const run = await runService.getOpenRun(rootCoords);

      expect(run).not.toBeNull();
      expect(run?.id).toBe(created.id);
    });

    it("does not return blocked runs", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const created = await runService.getOrCreateRun(userId, rootCoords);
      await runService.startStep(created.id, `${rootCoords},1`);
      await runService.markStepBlocked(created.id, `${rootCoords},1`, "Test block");

      const run = await runService.getOpenRun(rootCoords);

      expect(run).toBeNull();
    });

    it("does not return closed runs", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const created = await runService.getOrCreateRun(userId, rootCoords);
      await runService.closeRun(created.id);

      const run = await runService.getOpenRun(rootCoords);

      expect(run).toBeNull();
    });
  });

  describe("startStep", () => {
    it("adds entry to executionLog with startedAt timestamp", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);
      const stepCoords = `${rootCoords},1`;

      const updatedRun = await runService.startStep(run.id, stepCoords);

      expect(updatedRun.executionLog).toHaveLength(1);
      expect(updatedRun.executionLog[0]!.stepCoords).toBe(stepCoords);
      expect(updatedRun.executionLog[0]!.startedAt).toBeDefined();
    });

    it("does not change run status", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);

      const updatedRun = await runService.startStep(run.id, `${rootCoords},1`);

      expect(updatedRun.status).toBe("open");
    });
  });

  describe("markStepCompleted", () => {
    it("updates entry with completedAt timestamp", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);
      const stepCoords = `${rootCoords},1`;
      await runService.startStep(run.id, stepCoords);

      const updatedRun = await runService.markStepCompleted(run.id, stepCoords);

      expect(updatedRun.executionLog[0]!.completedAt).toBeDefined();
    });

    it("sets entry status to completed", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);
      const stepCoords = `${rootCoords},1`;
      await runService.startStep(run.id, stepCoords);

      const updatedRun = await runService.markStepCompleted(run.id, stepCoords);

      expect(updatedRun.executionLog[0]!.status).toBe("completed");
    });

    it("keeps run status as open", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);
      const stepCoords = `${rootCoords},1`;
      await runService.startStep(run.id, stepCoords);

      const updatedRun = await runService.markStepCompleted(run.id, stepCoords);

      expect(updatedRun.status).toBe("open");
    });
  });

  describe("markStepBlocked", () => {
    it("updates entry with blockageReason", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);
      const stepCoords = `${rootCoords},1`;
      const reason = "External API unavailable";
      await runService.startStep(run.id, stepCoords);

      const updatedRun = await runService.markStepBlocked(run.id, stepCoords, reason);

      expect(updatedRun.executionLog[0]!.blockageReason).toBe(reason);
    });

    it("sets entry status to blocked", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);
      const stepCoords = `${rootCoords},1`;
      await runService.startStep(run.id, stepCoords);

      const updatedRun = await runService.markStepBlocked(run.id, stepCoords, "Test reason");

      expect(updatedRun.executionLog[0]!.status).toBe("blocked");
    });

    it("sets run status to blocked", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);
      const stepCoords = `${rootCoords},1`;
      await runService.startStep(run.id, stepCoords);

      const updatedRun = await runService.markStepBlocked(run.id, stepCoords, "Test reason");

      expect(updatedRun.status).toBe("blocked");
    });

    it("sets run blockageReason", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);
      const stepCoords = `${rootCoords},1`;
      const reason = "External API unavailable";
      await runService.startStep(run.id, stepCoords);

      const updatedRun = await runService.markStepBlocked(run.id, stepCoords, reason);

      expect(updatedRun.blockageReason).toBe(reason);
    });
  });

  describe("closeRun", () => {
    it("sets status to closed", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);

      const closedRun = await runService.closeRun(run.id);

      expect(closedRun.status).toBe("closed");
    });

    it("preserves executionLog", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);
      const stepCoords = `${rootCoords},1`;
      await runService.startStep(run.id, stepCoords);
      await runService.markStepCompleted(run.id, stepCoords);

      const closedRun = await runService.closeRun(run.id);

      expect(closedRun.executionLog).toHaveLength(1);
      expect(closedRun.executionLog[0]!.status).toBe("completed");
    });
  });

  describe("resumeBlockedRun", () => {
    it("sets status back to open", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);
      const stepCoords = `${rootCoords},1`;
      await runService.startStep(run.id, stepCoords);
      await runService.markStepBlocked(run.id, stepCoords, "Test block");

      const resumedRun = await runService.resumeBlockedRun(run.id);

      expect(resumedRun.status).toBe("open");
    });

    it("clears blockageReason", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);
      const stepCoords = `${rootCoords},1`;
      await runService.startStep(run.id, stepCoords);
      await runService.markStepBlocked(run.id, stepCoords, "Test block");

      const resumedRun = await runService.resumeBlockedRun(run.id);

      expect(resumedRun.blockageReason).toBeNull();
    });

    it("throws if run is not blocked", async () => {
      const { userId, rootCoords } = createUniqueTestParams();
      const run = await runService.getOrCreateRun(userId, rootCoords);

      await expect(runService.resumeBlockedRun(run.id)).rejects.toThrow();
    });
  });
});
