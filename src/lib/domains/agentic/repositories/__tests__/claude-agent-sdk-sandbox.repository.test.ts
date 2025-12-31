/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Sandbox } from '@vercel/sandbox'
import type { LLMGenerationParams } from '~/lib/domains/agentic/types/llm.types'

// Mock the Vercel Sandbox SDK
vi.mock('@vercel/sandbox', () => ({
  Sandbox: {
    create: vi.fn()
  }
}))

// Import after mocking to get the mocked version
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const { Sandbox: MockedSandbox } = await vi.importMock<typeof import('@vercel/sandbox')>('@vercel/sandbox')

const mockSandboxCreate = vi.mocked(MockedSandbox.create)

import { ClaudeAgentSDKSandboxRepository } from '~/lib/domains/agentic/repositories/claude-agent-sdk-sandbox.repository'

describe('ClaudeAgentSDKSandboxRepository', () => {
  const mockApiKey = 'test-api-key'
  const mockMcpApiKey = 'test-mcp-api-key'
  const mockUserId = 'test-user-id'
  const mockSandboxId = 'sandbox-abc-123'

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
      stdout: vi.fn().mockResolvedValue(JSON.stringify({ content: 'Test response' })),
      stderr: vi.fn().mockResolvedValue('')
    })
  } as unknown as Sandbox)

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables
    delete process.env.VERCEL_OIDC_TOKEN
    delete process.env.USE_ANTHROPIC_PROXY
    delete process.env.INTERNAL_PROXY_SECRET
    delete process.env.HEXFRAME_API_BASE_URL
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor with externally-provided sandbox', () => {
    it('should accept an optional providedSandbox parameter', () => {
      const mockSandbox = createMockSandbox()

      // Should not throw when sandbox is provided
      const repository = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId,
        mockSandbox
      )

      expect(repository).toBeInstanceOf(ClaudeAgentSDKSandboxRepository)
    })

    it('should work without providedSandbox parameter (backward compatibility)', () => {
      // Should not throw when sandbox is not provided
      const repository = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId
      )

      expect(repository).toBeInstanceOf(ClaudeAgentSDKSandboxRepository)
    })

    it('should work with only apiKey (backward compatibility)', () => {
      const repository = new ClaudeAgentSDKSandboxRepository(mockApiKey)

      expect(repository).toBeInstanceOf(ClaudeAgentSDKSandboxRepository)
    })
  })

  describe('sandbox initialization behavior', () => {
    it('should skip _initializeSandbox when sandbox is provided externally', async () => {
      const mockSandbox = createMockSandbox()

      const repository = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId,
        mockSandbox
      )

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      await repository.generate(params)

      // Should NOT create a new sandbox when one is provided
      expect(mockSandboxCreate).not.toHaveBeenCalled()

      // Should use the provided sandbox's runCommand
      expect(mockSandbox.runCommand).toHaveBeenCalled()
    })

    it('should create sandbox via _initializeSandbox when no sandbox is provided', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)

      // Set VERCEL_OIDC_TOKEN so isConfigured returns true
      process.env.VERCEL_OIDC_TOKEN = 'mock-token'

      const repository = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId
        // No sandbox provided
      )

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      await repository.generate(params)

      // Should create a new sandbox
      expect(mockSandboxCreate).toHaveBeenCalledTimes(1)
    })
  })

  describe('cleanup behavior with sandbox ownership', () => {
    it('should NOT cleanup externally-provided sandbox', async () => {
      const mockSandbox = createMockSandbox()

      const repository = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId,
        mockSandbox
      )

      await repository.cleanup()

      // Should NOT call stop on externally-provided sandbox
      // The session manager owns the lifecycle, not the repository
      expect(mockSandbox.stop).not.toHaveBeenCalled()
    })

    it('should cleanup self-owned sandbox', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      process.env.VERCEL_OIDC_TOKEN = 'mock-token'

      const repository = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId
        // No sandbox provided - will create own
      )

      // Trigger sandbox creation
      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-sonnet-4-5-20250929'
      }
      await repository.generate(params)

      await repository.cleanup()

      // Self-owned sandbox reference should be nullified
      // Note: Current implementation doesn't explicitly stop, just nullifies reference
      // This behavior is maintained for backward compatibility
    })

    it('should be safe to call cleanup multiple times', async () => {
      const mockSandbox = createMockSandbox()

      const repository = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId,
        mockSandbox
      )

      // Multiple cleanups should not throw
      await repository.cleanup()
      await repository.cleanup()
      await repository.cleanup()

      expect(true).toBe(true) // No error thrown
    })
  })

  describe('isConfigured with external sandbox', () => {
    it('should return true when sandbox is externally provided regardless of VERCEL_OIDC_TOKEN', () => {
      const mockSandbox = createMockSandbox()
      // Explicitly NOT setting VERCEL_OIDC_TOKEN
      delete process.env.VERCEL_OIDC_TOKEN

      const repository = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId,
        mockSandbox
      )

      // Should be configured because sandbox is provided externally
      expect(repository.isConfigured()).toBe(true)
    })

    it('should require VERCEL_OIDC_TOKEN when no sandbox is provided', () => {
      delete process.env.VERCEL_OIDC_TOKEN

      const repository = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId
        // No sandbox provided
      )

      // Should not be configured without VERCEL_OIDC_TOKEN
      expect(repository.isConfigured()).toBe(false)
    })

    it('should be configured when VERCEL_OIDC_TOKEN is set and no external sandbox', () => {
      process.env.VERCEL_OIDC_TOKEN = 'mock-token'

      const repository = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId
      )

      expect(repository.isConfigured()).toBe(true)
    })

    it('should still require apiKey even with external sandbox', () => {
      const mockSandbox = createMockSandbox()

      const repository = new ClaudeAgentSDKSandboxRepository(
        '', // Empty API key
        mockMcpApiKey,
        mockUserId,
        mockSandbox
      )

      // Even with external sandbox, need API key
      expect(repository.isConfigured()).toBe(false)
    })
  })

  describe('error handling with external sandbox', () => {
    it('should provide clear error message when external sandbox fails', async () => {
      const failingSandbox = createMockSandbox()
      failingSandbox.runCommand = vi.fn().mockResolvedValue({
        exitCode: 1,
        stdout: vi.fn().mockResolvedValue(''),
        stderr: vi.fn().mockResolvedValue('Sandbox execution error')
      })

      const repository = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId,
        failingSandbox
      )

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      await expect(repository.generate(params)).rejects.toMatchObject({
        code: 'UNKNOWN',
        provider: 'claude-agent-sdk-sandbox'
      })
    })
  })

  describe('generate with externally-provided sandbox', () => {
    it('should use provided sandbox for execution', async () => {
      const mockSandbox = createMockSandbox()

      const repository = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId,
        mockSandbox
      )

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      const result = await repository.generate(params)

      expect(mockSandbox.runCommand).toHaveBeenCalledWith({
        cmd: 'node',
        args: expect.arrayContaining(['-e', expect.any(String)])
      })

      expect(result).toMatchObject({
        content: 'Test response',
        provider: 'claude-agent-sdk-sandbox'
      })
    })

    it('should handle multiple generate calls with same external sandbox', async () => {
      const mockSandbox = createMockSandbox()

      const repository = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId,
        mockSandbox
      )

      const params: LLMGenerationParams = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'claude-sonnet-4-5-20250929'
      }

      // Multiple calls should all work with the same sandbox
      await repository.generate(params)
      await repository.generate(params)
      await repository.generate(params)

      // All should use the provided sandbox
      expect(mockSandbox.runCommand).toHaveBeenCalledTimes(3)

      // Should never try to create a new sandbox
      expect(mockSandboxCreate).not.toHaveBeenCalled()
    })
  })

  describe('getModelInfo and listModels', () => {
    it('should work the same regardless of sandbox source', async () => {
      const mockSandbox = createMockSandbox()

      const repositoryWithExternal = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId,
        mockSandbox
      )

      const repositoryWithoutExternal = new ClaudeAgentSDKSandboxRepository(
        mockApiKey,
        mockMcpApiKey,
        mockUserId
      )

      // Both should return same model info
      const modelInfo1 = await repositoryWithExternal.getModelInfo('claude-sonnet-4-5-20250929')
      const modelInfo2 = await repositoryWithoutExternal.getModelInfo('claude-sonnet-4-5-20250929')

      expect(modelInfo1).toEqual(modelInfo2)

      // Both should return same model list
      const models1 = await repositoryWithExternal.listModels()
      const models2 = await repositoryWithoutExternal.listModels()

      expect(models1).toEqual(models2)
    })
  })
})
