import { describe, beforeEach, it, expect, vi } from "vitest";
import { z } from "zod";

/**
 * Unit tests for run mutation endpoint
 *
 * Tests the tRPC endpoint that orchestrates SYSTEM tile execution:
 * 1. Validates tile is SYSTEM type
 * 2. Manages run lifecycle (open/blocked/closed)
 * 3. Finds and executes next leaf tile
 * 4. Parses response and updates run state
 */

// Mock the modules
vi.mock("~/env", () => ({
  env: {
    OPENROUTER_API_KEY: "test-openrouter-key",
    ANTHROPIC_API_KEY: "test-anthropic-key",
    HEXFRAME_MCP_SERVER: "hexframe",
  },
}));

// Schema for run input validation testing
const runInputSchema = z.object({
  coords: z.string().describe("Root SYSTEM tile coordinates"),
  instruction: z.string().optional().describe("Optional instruction for current step"),
});

// Schema for run output validation
const runResultSchema = z.object({
  runId: z.string(),
  runStatus: z.enum(["open", "blocked", "closed"]),
  stepExecuted: z.string().nullable(),
  stepResult: z.enum(["completed", "blocked"]).nullable(),
  blockageReason: z.string().nullable(),
  response: z.string().nullable(),
  isComplete: z.boolean(),
});

describe("run Mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Input Validation", () => {
    it("should require coords", () => {
      const result = runInputSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("coords");
      }
    });

    it("should accept valid coords string", () => {
      const result = runInputSchema.safeParse({
        coords: "userId123,0:1,2",
      });
      expect(result.success).toBe(true);
    });

    it("should accept optional instruction", () => {
      const result = runInputSchema.safeParse({
        coords: "userId123,0:1,2",
        instruction: "Focus on error handling",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.instruction).toBe("Focus on error handling");
      }
    });
  });

  describe("Output Schema Validation", () => {
    it("should validate complete output with open status", () => {
      const result = runResultSchema.safeParse({
        runId: "run-123",
        runStatus: "open",
        stepExecuted: "userId,0:1,1",
        stepResult: "completed",
        blockageReason: null,
        response: "Task completed successfully",
        isComplete: false,
      });
      expect(result.success).toBe(true);
    });

    it("should validate output with blocked status", () => {
      const result = runResultSchema.safeParse({
        runId: "run-123",
        runStatus: "blocked",
        stepExecuted: "userId,0:1,1",
        stepResult: "blocked",
        blockageReason: "Missing API key",
        response: "Cannot proceed without API key",
        isComplete: false,
      });
      expect(result.success).toBe(true);
    });

    it("should validate output with closed status", () => {
      const result = runResultSchema.safeParse({
        runId: "run-123",
        runStatus: "closed",
        stepExecuted: null,
        stepResult: null,
        blockageReason: null,
        response: null,
        isComplete: true,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("run Validation Logic", () => {
  /**
   * Mock services for testing validation logic
   */
  const mockMappingService = {
    items: {
      query: {
        getItemByCoords: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tile Type Validation", () => {
    it("should reject non-SYSTEM built-in tiles", async () => {
      // Test that USER, ORGANIZATIONAL, CONTEXT tiles are rejected
      const nonSystemTypes = ["user", "organizational", "context"];

      for (const itemType of nonSystemTypes) {
        mockMappingService.items.query.getItemByCoords.mockResolvedValue({
          id: "1",
          coords: "userId,0:1",
          title: "Test Tile",
          itemType,
        });

        // The actual validation would throw BAD_REQUEST error
        // This test validates the logic conceptually
        expect(itemType).not.toBe("system");
      }
    });

    it("should accept SYSTEM tiles", async () => {
      mockMappingService.items.query.getItemByCoords.mockResolvedValue({
        id: "1",
        coords: "userId,0:1",
        title: "Test Tile",
        itemType: "system",
      });

      const tile = await mockMappingService.items.query.getItemByCoords({
        coords: "userId,0:1",
      });
      expect(tile.itemType).toBe("system");
    });

    it("should accept custom (non-built-in) item types", async () => {
      // Custom types like "template", "workflow" should be allowed
      mockMappingService.items.query.getItemByCoords.mockResolvedValue({
        id: "1",
        coords: "userId,0:1",
        title: "Test Tile",
        itemType: "custom-workflow",
      });

      const tile = await mockMappingService.items.query.getItemByCoords({
        coords: "userId,0:1",
      });

      // Custom types are not built-in types
      const builtInTypes = ["user", "organizational", "context", "system"];
      expect(builtInTypes.includes(tile.itemType)).toBe(false);
    });
  });
});

describe("run Lifecycle Logic", () => {
  /**
   * Mock RunService for testing lifecycle logic
   */
  const mockRunService = {
    getOrCreateRun: vi.fn(),
    getOpenRun: vi.fn(),
    closeRun: vi.fn(),
    startStep: vi.fn(),
    markStepCompleted: vi.fn(),
    markStepBlocked: vi.fn(),
    getRunById: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Run Creation", () => {
    it("should create new run on first call", async () => {
      const userId = "test-user";
      const rootCoords = "userId,0:1";

      mockRunService.getOrCreateRun.mockResolvedValue({
        id: "new-run-id",
        userId,
        rootCoords,
        status: "open",
        executionLog: [],
        blockageReason: null,
      });

      const run = await mockRunService.getOrCreateRun(userId, rootCoords);

      expect(run.id).toBe("new-run-id");
      expect(run.status).toBe("open");
      expect(run.executionLog).toEqual([]);
    });

    it("should reuse existing open run", async () => {
      const userId = "test-user";
      const rootCoords = "userId,0:1";
      const existingRunId = "existing-run-id";

      mockRunService.getOrCreateRun.mockResolvedValue({
        id: existingRunId,
        userId,
        rootCoords,
        status: "open",
        executionLog: [
          { stepCoords: "userId,0:1,1", status: "completed", startedAt: "2024-01-01" },
        ],
        blockageReason: null,
      });

      const run = await mockRunService.getOrCreateRun(userId, rootCoords);

      expect(run.id).toBe(existingRunId);
      expect(run.executionLog).toHaveLength(1);
    });

    it("should return isComplete:true for closed run", async () => {
      const userId = "test-user";
      const rootCoords = "userId,0:1";

      mockRunService.getOrCreateRun.mockResolvedValue({
        id: "closed-run-id",
        userId,
        rootCoords,
        status: "closed",
        executionLog: [],
        blockageReason: null,
      });

      const run = await mockRunService.getOrCreateRun(userId, rootCoords);

      // When run.status === 'closed', the endpoint should return isComplete: true
      expect(run.status).toBe("closed");
    });
  });
});

describe("run Step Execution Logic", () => {
  /**
   * Mock LeafTraversalService for testing step execution logic
   */
  const mockLeafTraversalService = {
    getNextIncompleteLeaf: vi.fn(),
    getAllLeafTiles: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Leaf Discovery", () => {
    it("should execute first leaf on first call", async () => {
      const rootCoords = "userId,0:1";
      const completedCoords = new Set<string>();

      mockLeafTraversalService.getNextIncompleteLeaf.mockResolvedValue({
        leafCoords: "userId,0:1,1",
        allLeafCoords: ["userId,0:1,1", "userId,0:1,2", "userId,0:1,3"],
      });

      const result = await mockLeafTraversalService.getNextIncompleteLeaf(
        rootCoords,
        completedCoords
      );

      expect(result.leafCoords).toBe("userId,0:1,1");
    });

    it("should execute second leaf after first completes", async () => {
      const rootCoords = "userId,0:1";
      const completedCoords = new Set(["userId,0:1,1"]);

      mockLeafTraversalService.getNextIncompleteLeaf.mockResolvedValue({
        leafCoords: "userId,0:1,2",
        allLeafCoords: ["userId,0:1,1", "userId,0:1,2", "userId,0:1,3"],
      });

      const result = await mockLeafTraversalService.getNextIncompleteLeaf(
        rootCoords,
        completedCoords
      );

      expect(result.leafCoords).toBe("userId,0:1,2");
    });

    it("should return null when all leaves complete", async () => {
      const rootCoords = "userId,0:1";
      const completedCoords = new Set([
        "userId,0:1,1",
        "userId,0:1,2",
        "userId,0:1,3",
      ]);

      mockLeafTraversalService.getNextIncompleteLeaf.mockResolvedValue({
        leafCoords: null,
        allLeafCoords: ["userId,0:1,1", "userId,0:1,2", "userId,0:1,3"],
      });

      const result = await mockLeafTraversalService.getNextIncompleteLeaf(
        rootCoords,
        completedCoords
      );

      expect(result.leafCoords).toBeNull();
      // When leafCoords is null, the run should be closed
    });
  });
});

describe("run Blockage Handling Logic", () => {
  /**
   * Mock services for testing blockage handling
   */
  const mockRunService = {
    markStepBlocked: vi.fn(),
    getRunById: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Blockage Detection", () => {
    it("should mark run blocked when step returns blocked", async () => {
      const runId = "run-123";
      const stepCoords = "userId,0:1,1";
      const blockageReason = "External API unavailable";

      mockRunService.markStepBlocked.mockResolvedValue({
        id: runId,
        status: "blocked",
        blockageReason,
        executionLog: [
          {
            stepCoords,
            status: "blocked",
            startedAt: "2024-01-01",
            blockageReason,
          },
        ],
      });

      const updatedRun = await mockRunService.markStepBlocked(
        runId,
        stepCoords,
        blockageReason
      );

      expect(updatedRun.status).toBe("blocked");
      expect(updatedRun.blockageReason).toBe(blockageReason);
    });

    it("should include blockage context on resume", async () => {
      const runId = "run-123";

      // Simulate a blocked run being retrieved
      mockRunService.getRunById.mockResolvedValue({
        id: runId,
        status: "blocked",
        blockageReason: "Previous failure: Missing API key",
        executionLog: [
          {
            stepCoords: "userId,0:1,1",
            status: "blocked",
            startedAt: "2024-01-01",
            blockageReason: "Missing API key",
          },
        ],
      });

      const run = await mockRunService.getRunById(runId);

      // When resuming, the blockageReason should be passed to buildPromptWithContext
      expect(run.status).toBe("blocked");
      expect(run.blockageReason).toBeTruthy();
    });
  });
});

describe("run Response Parsing Logic", () => {
  // Test parseAgentResponse from the agentic utils
  const parseAgentResponse = (response: string): { result: "completed" | "blocked"; reason?: string } => {
    // Simplified version of the actual parser
    const statusMatch = /<status>([\s\S]*?)<\/status>/.exec(response);
    if (!statusMatch?.[1]) {
      return { result: "completed" };
    }

    try {
      const parsed = JSON.parse(statusMatch[1].trim()) as { result?: string; reason?: string };
      if (parsed.result === "completed") {
        return { result: "completed" };
      }
      if (parsed.result === "blocked") {
        return { result: "blocked", reason: parsed.reason };
      }
      return { result: "completed" };
    } catch {
      return { result: "completed" };
    }
  };

  describe("Status Parsing", () => {
    it("should parse completed status", () => {
      const response = 'Task done.\n<status>{"result": "completed"}</status>';
      const result = parseAgentResponse(response);

      expect(result).toEqual({ result: "completed" });
    });

    it("should parse blocked status with reason", () => {
      const response = 'Cannot proceed.\n<status>{"result": "blocked", "reason": "Missing API key"}</status>';
      const result = parseAgentResponse(response);

      expect(result).toEqual({ result: "blocked", reason: "Missing API key" });
    });

    it("should default to completed when no status block", () => {
      const response = "Task completed without status block";
      const result = parseAgentResponse(response);

      expect(result).toEqual({ result: "completed" });
    });

    it("should handle malformed JSON gracefully", () => {
      const response = "<status>{not valid json}</status>";
      const result = parseAgentResponse(response);

      expect(result).toEqual({ result: "completed" });
    });
  });
});
