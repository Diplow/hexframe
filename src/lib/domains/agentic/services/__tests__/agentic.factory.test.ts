/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Sandbox } from '@vercel/sandbox'
import type { EventBusService } from '~/lib/utils/event-bus'
import type { CreateAgenticServiceOptions } from '~/lib/domains/agentic/services/agentic.factory'

// Mock the sandbox session manager
vi.mock('~/lib/domains/agentic/services/sandbox-session', () => ({
  SandboxSessionManager: vi.fn(),
  sandboxSessionManager: {
    getOrCreateSession: vi.fn(),
    getSession: vi.fn(),
    invalidateSession: vi.fn(),
    extendSession: vi.fn(),
    isSessionValid: vi.fn(),
    cleanup: vi.fn()
  }
}))

// Mock the Vercel Sandbox SDK
vi.mock('@vercel/sandbox', () => ({
  Sandbox: {
    create: vi.fn(),
    get: vi.fn()
  }
}))

// Mock the repositories to avoid side effects
vi.mock('~/lib/domains/agentic/repositories/claude-agent-sdk-sandbox.repository', () => ({
  ClaudeAgentSDKSandboxRepository: vi.fn().mockImplementation(() => ({
    isConfigured: vi.fn().mockReturnValue(true),
    generate: vi.fn(),
    cleanup: vi.fn()
  }))
}))

vi.mock('~/lib/domains/agentic/repositories/claude-agent-sdk.repository', () => ({
  ClaudeAgentSDKRepository: vi.fn().mockImplementation(() => ({
    isConfigured: vi.fn().mockReturnValue(true),
    generate: vi.fn(),
    cleanup: vi.fn()
  }))
}))

vi.mock('~/lib/domains/agentic/repositories/openrouter.repository', () => ({
  OpenRouterRepository: vi.fn().mockImplementation(() => ({
    isConfigured: vi.fn().mockReturnValue(true),
    generate: vi.fn(),
    cleanup: vi.fn()
  }))
}))

// Import after mocking
import { createAgenticService, createAgenticServiceAsync } from '~/lib/domains/agentic/services/agentic.factory'
import { ClaudeAgentSDKSandboxRepository } from '~/lib/domains/agentic/repositories/claude-agent-sdk-sandbox.repository'
import { sandboxSessionManager } from '~/lib/domains/agentic/services/sandbox-session'

const MockedClaudeAgentSDKSandboxRepository = vi.mocked(ClaudeAgentSDKSandboxRepository)

describe('createAgenticService factory', () => {
  const mockEventBus: EventBusService = {
    emit: vi.fn(),
    on: vi.fn(),
    getListenerCount: vi.fn()
  }

  const mockSandboxId = 'sandbox-session-123'

  const createMockSandbox = (overrides: Partial<{
    sandboxId: string
    status: 'pending' | 'running' | 'stopping' | 'stopped' | 'failed'
  }> = {}): Sandbox => ({
    sandboxId: overrides.sandboxId ?? mockSandboxId,
    status: overrides.status ?? 'running',
    extendTimeout: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    runCommand: vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: vi.fn().mockResolvedValue(''),
      stderr: vi.fn().mockResolvedValue('')
    })
  } as unknown as Sandbox)

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables
    delete process.env.VERCEL_OIDC_TOKEN
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('backward compatibility (no sessionId)', () => {
    it('should work without sessionId parameter', () => {
      const options: CreateAgenticServiceOptions = {
        llmConfig: {
          anthropicApiKey: 'test-key',
          preferClaudeSDK: true,
          useSandbox: true
        },
        eventBus: mockEventBus,
        userId: 'test-user'
      }

      // Should not throw
      const service = createAgenticService(options)

      expect(service).toBeDefined()
    })

    it('should create ClaudeAgentSDKSandboxRepository without external sandbox when no sessionId', () => {
      const options: CreateAgenticServiceOptions = {
        llmConfig: {
          anthropicApiKey: 'test-key',
          preferClaudeSDK: true,
          useSandbox: true
        },
        eventBus: mockEventBus,
        userId: 'test-user'
      }

      createAgenticService(options)

      // Should be called with undefined for external sandbox (4th arg)
      expect(MockedClaudeAgentSDKSandboxRepository).toHaveBeenCalledWith(
        'test-key',
        undefined, // mcpApiKey
        'test-user',
        undefined // No external sandbox
      )
    })
  })

  describe('createAgenticServiceAsync with sessionId', () => {
    it('should accept sessionId in options', async () => {
      const mockSandbox = createMockSandbox()
      vi.mocked(sandboxSessionManager.getOrCreateSession).mockResolvedValueOnce(mockSandbox)

      const options: CreateAgenticServiceOptions = {
        llmConfig: {
          anthropicApiKey: 'test-key',
          preferClaudeSDK: true,
          useSandbox: true
        },
        eventBus: mockEventBus,
        userId: 'test-user',
        sessionId: 'session-123'
      }

      const service = await createAgenticServiceAsync(options)

      expect(service).toBeDefined()
    })

    it('should call sandboxSessionManager.getOrCreateSession when sessionId and useSandbox are provided', async () => {
      const mockSandbox = createMockSandbox()
      vi.mocked(sandboxSessionManager.getOrCreateSession).mockResolvedValueOnce(mockSandbox)

      const options: CreateAgenticServiceOptions = {
        llmConfig: {
          anthropicApiKey: 'test-key',
          preferClaudeSDK: true,
          useSandbox: true
        },
        eventBus: mockEventBus,
        userId: 'test-user',
        sessionId: 'session-123'
      }

      await createAgenticServiceAsync(options)

      expect(sandboxSessionManager.getOrCreateSession).toHaveBeenCalledWith('session-123')
    })

    it('should pass retrieved sandbox to ClaudeAgentSDKSandboxRepository constructor', async () => {
      const mockSandbox = createMockSandbox()
      vi.mocked(sandboxSessionManager.getOrCreateSession).mockResolvedValueOnce(mockSandbox)

      const options: CreateAgenticServiceOptions = {
        llmConfig: {
          anthropicApiKey: 'test-key',
          preferClaudeSDK: true,
          useSandbox: true,
          mcpApiKey: 'test-mcp-key'
        },
        eventBus: mockEventBus,
        userId: 'test-user',
        sessionId: 'session-123'
      }

      await createAgenticServiceAsync(options)

      // Should be called with 4th argument (external sandbox)
      expect(MockedClaudeAgentSDKSandboxRepository).toHaveBeenCalledWith(
        'test-key',
        'test-mcp-key',
        'test-user',
        mockSandbox // External sandbox from session manager
      )
    })

    it('should NOT call sandboxSessionManager when sessionId provided but useSandbox is false', async () => {
      const options: CreateAgenticServiceOptions = {
        llmConfig: {
          anthropicApiKey: 'test-key',
          preferClaudeSDK: true,
          useSandbox: false // Not using sandbox
        },
        eventBus: mockEventBus,
        userId: 'test-user',
        sessionId: 'session-123'
      }

      await createAgenticServiceAsync(options)

      expect(sandboxSessionManager.getOrCreateSession).not.toHaveBeenCalled()
    })

    it('should NOT call sandboxSessionManager when useSandbox is true but no sessionId', async () => {
      const options: CreateAgenticServiceOptions = {
        llmConfig: {
          anthropicApiKey: 'test-key',
          preferClaudeSDK: true,
          useSandbox: true
        },
        eventBus: mockEventBus,
        userId: 'test-user'
        // No sessionId
      }

      await createAgenticServiceAsync(options)

      expect(sandboxSessionManager.getOrCreateSession).not.toHaveBeenCalled()
    })

    it('should work with OpenRouter when no anthropic key (no sandbox needed)', async () => {
      const options: CreateAgenticServiceOptions = {
        llmConfig: {
          openRouterApiKey: 'openrouter-key',
          useSandbox: true // Ignored for OpenRouter
        },
        eventBus: mockEventBus,
        userId: 'test-user',
        sessionId: 'session-123'
      }

      const service = await createAgenticServiceAsync(options)

      expect(service).toBeDefined()
      // Should not try to get session for non-sandbox repository
      expect(sandboxSessionManager.getOrCreateSession).not.toHaveBeenCalled()
    })
  })

  describe('sessionId with queued repository', () => {
    it('should work with useQueue and sessionId together', async () => {
      const mockSandbox = createMockSandbox()
      vi.mocked(sandboxSessionManager.getOrCreateSession).mockResolvedValueOnce(mockSandbox)

      const options: CreateAgenticServiceOptions = {
        llmConfig: {
          anthropicApiKey: 'test-key',
          preferClaudeSDK: true,
          useSandbox: true
        },
        eventBus: mockEventBus,
        userId: 'test-user',
        sessionId: 'session-123',
        useQueue: true
      }

      const service = await createAgenticServiceAsync(options)

      expect(service).toBeDefined()
      expect(sandboxSessionManager.getOrCreateSession).toHaveBeenCalledWith('session-123')
    })
  })

  describe('session retrieval failure handling', () => {
    it('should propagate error when sandboxSessionManager fails', async () => {
      vi.mocked(sandboxSessionManager.getOrCreateSession).mockRejectedValueOnce(
        new Error('Session manager failed')
      )

      const options: CreateAgenticServiceOptions = {
        llmConfig: {
          anthropicApiKey: 'test-key',
          preferClaudeSDK: true,
          useSandbox: true
        },
        eventBus: mockEventBus,
        userId: 'test-user',
        sessionId: 'session-123'
      }

      await expect(createAgenticServiceAsync(options)).rejects.toThrow('Session manager failed')
    })
  })

  describe('fallback path (anthropicApiKey without preferClaudeSDK)', () => {
    it('should use sandbox with sessionId when only anthropicApiKey is provided', async () => {
      const mockSandbox = createMockSandbox()
      vi.mocked(sandboxSessionManager.getOrCreateSession).mockResolvedValueOnce(mockSandbox)

      const options: CreateAgenticServiceOptions = {
        llmConfig: {
          anthropicApiKey: 'test-key',
          // No preferClaudeSDK - falls through to anthropic key fallback
          useSandbox: true
        },
        eventBus: mockEventBus,
        userId: 'test-user',
        sessionId: 'session-123'
      }

      await createAgenticServiceAsync(options)

      expect(sandboxSessionManager.getOrCreateSession).toHaveBeenCalledWith('session-123')
      expect(MockedClaudeAgentSDKSandboxRepository).toHaveBeenCalledWith(
        'test-key',
        undefined,
        'test-user',
        mockSandbox
      )
    })
  })
})
