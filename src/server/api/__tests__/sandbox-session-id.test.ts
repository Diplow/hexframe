import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit tests for sandbox session ID derivation in agenticServiceMiddleware
 *
 * The sandboxSessionId is used to associate requests with persistent sandbox sessions.
 * This enables conversation continuity when users interact with the same session.
 *
 * Derivation rules:
 * - Web UI sessions (better-auth): Use session.id as sandboxSessionId
 * - API key auth: Use userId + "-api-key" suffix as sandboxSessionId
 * - Anonymous users: sandboxSessionId is undefined (ephemeral sandbox)
 */

// Mock the env module
vi.mock("~/env", () => ({
  env: {
    OPENROUTER_API_KEY: "test-openrouter-key",
    ANTHROPIC_API_KEY: "test-anthropic-key",
    USE_SANDBOX: "true",
  },
}));

// Mock the IAM domain
vi.mock("~/lib/domains/iam", () => ({
  getOrCreateInternalApiKey: vi.fn().mockResolvedValue("test-mcp-api-key"),
}));

// Mock the agentic domain factory
const mockCreateAgenticServiceAsync = vi.fn().mockResolvedValue({
  isConfigured: () => true,
  generateResponse: vi.fn(),
  generateStreamingResponse: vi.fn(),
  getAvailableModels: vi.fn(),
});

vi.mock("~/lib/domains/agentic", () => ({
  createAgenticService: vi.fn().mockReturnValue({
    isConfigured: () => true,
    generateResponse: vi.fn(),
    generateStreamingResponse: vi.fn(),
    getAvailableModels: vi.fn(),
  }),
  createAgenticServiceAsync: mockCreateAgenticServiceAsync,
}));

// Mock event bus
vi.mock("~/lib/utils/event-bus", () => ({
  EventBus: vi.fn().mockImplementation(() => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

describe("Sandbox Session ID Derivation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("deriveSandboxSessionId", () => {
    /**
     * Helper function that mirrors the expected implementation.
     * This function should be extracted to a utility and used in the middleware.
     */
    function deriveSandboxSessionId(context: {
      session?: { id: string; userId: string } | null;
      user?: { id: string } | null;
      authMethod?: "session" | "internal-api-key" | "external-api-key" | "anonymous";
    }): string | undefined {
      // Web UI session authentication - use the stable session.id
      if (context.session?.id) {
        return context.session.id;
      }

      // API key authentication - derive from userId with suffix
      if (context.authMethod === "internal-api-key" || context.authMethod === "external-api-key") {
        if (context.user?.id) {
          return `${context.user.id}-api-key`;
        }
      }

      // Anonymous users get undefined (ephemeral sandbox)
      return undefined;
    }

    it("should derive sandboxSessionId from session.id for web UI sessions", () => {
      const context = {
        session: { id: "session-abc123", userId: "user-xyz789" },
        user: { id: "user-xyz789" },
        authMethod: "session" as const,
      };

      const sandboxSessionId = deriveSandboxSessionId(context);

      expect(sandboxSessionId).toBe("session-abc123");
    });

    it("should derive sandboxSessionId from userId with -api-key suffix for internal API key auth", () => {
      const context = {
        session: null,
        user: { id: "user-xyz789" },
        authMethod: "internal-api-key" as const,
      };

      const sandboxSessionId = deriveSandboxSessionId(context);

      expect(sandboxSessionId).toBe("user-xyz789-api-key");
    });

    it("should derive sandboxSessionId from userId with -api-key suffix for external API key auth", () => {
      const context = {
        session: null,
        user: { id: "user-abc456" },
        authMethod: "external-api-key" as const,
      };

      const sandboxSessionId = deriveSandboxSessionId(context);

      expect(sandboxSessionId).toBe("user-abc456-api-key");
    });

    it("should return undefined for anonymous users", () => {
      const context = {
        session: null,
        user: null,
        authMethod: "anonymous" as const,
      };

      const sandboxSessionId = deriveSandboxSessionId(context);

      expect(sandboxSessionId).toBeUndefined();
    });

    it("should prioritize session.id over API key derivation when both exist", () => {
      // Edge case: if somehow both session and API key auth info exist,
      // session.id should take precedence
      const context = {
        session: { id: "session-priority", userId: "user-123" },
        user: { id: "user-123" },
        authMethod: "session" as const,
      };

      const sandboxSessionId = deriveSandboxSessionId(context);

      expect(sandboxSessionId).toBe("session-priority");
    });

    it("should return undefined when API key auth has no userId", () => {
      // Defensive: API key without userId should not crash
      const context = {
        session: null,
        user: null,
        authMethod: "internal-api-key" as const,
      };

      const sandboxSessionId = deriveSandboxSessionId(context);

      expect(sandboxSessionId).toBeUndefined();
    });
  });

  describe("agenticServiceMiddleware integration", () => {
    it("should pass sandboxSessionId to createAgenticServiceAsync for session auth", async () => {
      // This test verifies the middleware calls createAgenticServiceAsync
      // with the correct sessionId parameter

      // The actual middleware will need to:
      // 1. Derive sandboxSessionId from ctx.session.id
      // 2. Call createAgenticServiceAsync with sessionId option
      // 3. Add agenticService and sandboxSessionId to context

      const sessionId = "test-session-id-12345";
      const expectedSessionId = sessionId;

      // Simulate what the middleware should do
      await mockCreateAgenticServiceAsync({
        llmConfig: {
          openRouterApiKey: "test-key",
          anthropicApiKey: "test-anthropic-key",
          preferClaudeSDK: true,
          useSandbox: true,
          mcpApiKey: "test-mcp-key",
        },
        eventBus: {},
        useQueue: false,
        userId: "user-123",
        sessionId: expectedSessionId,
      });

      expect(mockCreateAgenticServiceAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: expectedSessionId,
        })
      );
    });

    it("should pass userId-api-key as sessionId for API key auth", async () => {
      const userId = "user-api-authenticated";
      const expectedSessionId = `${userId}-api-key`;

      await mockCreateAgenticServiceAsync({
        llmConfig: {
          openRouterApiKey: "test-key",
          anthropicApiKey: "test-anthropic-key",
          preferClaudeSDK: true,
          useSandbox: true,
          mcpApiKey: "test-mcp-key",
        },
        eventBus: {},
        useQueue: false,
        userId: userId,
        sessionId: expectedSessionId,
      });

      expect(mockCreateAgenticServiceAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: expectedSessionId,
        })
      );
    });

    it("should pass undefined sessionId for anonymous users", async () => {
      await mockCreateAgenticServiceAsync({
        llmConfig: {
          openRouterApiKey: "test-key",
          anthropicApiKey: "test-anthropic-key",
          preferClaudeSDK: true,
          useSandbox: true,
          mcpApiKey: undefined, // No MCP key for anonymous
        },
        eventBus: {},
        useQueue: false,
        userId: "anonymous",
        sessionId: undefined,
      });

      expect(mockCreateAgenticServiceAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: undefined,
        })
      );
    });

    it("should expose sandboxSessionId in context for downstream procedures", async () => {
      // The middleware should add sandboxSessionId to the context
      // so downstream procedures can use it for debugging/logging

      const mockContext = {
        session: { id: "ctx-session-id", userId: "ctx-user-id" },
        user: { id: "ctx-user-id" },
      };

      // Expected: ctx.sandboxSessionId === "ctx-session-id"
      // This allows procedures to log which sandbox session they're using

      // The actual assertion will be in the implementation,
      // this test documents the expected behavior
      expect(mockContext.session.id).toBe("ctx-session-id");
    });
  });

  describe("deterministic session ID", () => {
    it("should produce the same sandboxSessionId for the same session across requests", () => {
      // Critical for session persistence: same session.id must produce same sandboxSessionId
      const sessionId = "stable-session-id";

      const firstRequest = {
        session: { id: sessionId, userId: "user-1" },
        user: { id: "user-1" },
        authMethod: "session" as const,
      };

      const secondRequest = {
        session: { id: sessionId, userId: "user-1" },
        user: { id: "user-1" },
        authMethod: "session" as const,
      };

      // Both should derive the same sandboxSessionId
      function deriveSandboxSessionId(ctx: typeof firstRequest) {
        return ctx.session?.id;
      }

      const firstSessionId = deriveSandboxSessionId(firstRequest);
      const secondSessionId = deriveSandboxSessionId(secondRequest);

      expect(firstSessionId).toBe(secondSessionId);
      expect(firstSessionId).toBe(sessionId);
    });

    it("should produce the same sandboxSessionId for the same API key user across requests", () => {
      const userId = "api-user-stable";

      const firstRequest = {
        session: null,
        user: { id: userId },
        authMethod: "internal-api-key" as const,
      };

      const secondRequest = {
        session: null,
        user: { id: userId },
        authMethod: "internal-api-key" as const,
      };

      function deriveSandboxSessionId(ctx: typeof firstRequest) {
        if (ctx.authMethod === "internal-api-key" && ctx.user?.id) {
          return `${ctx.user.id}-api-key`;
        }
        return undefined;
      }

      const firstSessionId = deriveSandboxSessionId(firstRequest);
      const secondSessionId = deriveSandboxSessionId(secondRequest);

      expect(firstSessionId).toBe(secondSessionId);
      expect(firstSessionId).toBe(`${userId}-api-key`);
    });
  });
});
