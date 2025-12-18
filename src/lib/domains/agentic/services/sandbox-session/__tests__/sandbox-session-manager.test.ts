/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SandboxSessionManager } from '~/lib/domains/agentic/services/sandbox-session/sandbox-session-manager.service'
import type { SandboxSessionManagerConfig } from '~/lib/domains/agentic/services/sandbox-session/sandbox-session.types'
import type { Sandbox } from '@vercel/sandbox'

// Mock the Vercel Sandbox SDK
vi.mock('@vercel/sandbox', () => ({
  Sandbox: {
    create: vi.fn(),
    get: vi.fn()
  }
}))

// Import after mocking to get the mocked version
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const { Sandbox: MockedSandbox } = await vi.importMock<typeof import('@vercel/sandbox')>('@vercel/sandbox')

const mockSandboxCreate = vi.mocked(MockedSandbox.create)
const mockSandboxGet = vi.mocked(MockedSandbox.get)

describe('SandboxSessionManager', () => {
  let sessionManager: SandboxSessionManager
  const mockUserId = 'user-123'
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
      stdout: vi.fn().mockResolvedValue(''),
      stderr: vi.fn().mockResolvedValue('')
    })
  } as unknown as Sandbox)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    const defaultConfig: SandboxSessionManagerConfig = {
      defaultTimeoutMs: 5 * 60 * 1000, // 5 minutes
      extendOnAccessMs: 2 * 60 * 1000, // 2 minutes
      maxTimeoutMs: 45 * 60 * 1000 // 45 minutes (Hobby tier max)
    }
    sessionManager = new SandboxSessionManager(defaultConfig)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('getOrCreateSession', () => {
    it('should create a new sandbox when none exists for user', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)

      const sandbox = await sessionManager.getOrCreateSession(mockUserId)

      expect(mockSandboxCreate).toHaveBeenCalledTimes(1)
      expect(sandbox.sandboxId).toBe(mockSandboxId)
    })

    it('should reuse existing sandbox via Sandbox.get when session exists', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockResolvedValueOnce(mockSandbox)

      // First call creates sandbox
      await sessionManager.getOrCreateSession(mockUserId)
      expect(mockSandboxCreate).toHaveBeenCalledTimes(1)

      // Second call should reconnect via Sandbox.get
      const sandbox = await sessionManager.getOrCreateSession(mockUserId)

      expect(mockSandboxGet).toHaveBeenCalledWith({ sandboxId: mockSandboxId })
      expect(sandbox.sandboxId).toBe(mockSandboxId)
      // Should not create a new sandbox
      expect(mockSandboxCreate).toHaveBeenCalledTimes(1)
    })

    it('should extend sandbox timeout on access', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockResolvedValueOnce(mockSandbox)

      // First call creates sandbox
      await sessionManager.getOrCreateSession(mockUserId)

      // Second call should extend timeout
      await sessionManager.getOrCreateSession(mockUserId)

      expect(mockSandbox.extendTimeout).toHaveBeenCalled()
    })

    it('should handle race conditions - only one sandbox created for concurrent requests', async () => {
      const mockSandbox = createMockSandbox()
      // Simulate slow sandbox creation
      mockSandboxCreate.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockSandbox), 100))
      )

      // Start multiple concurrent requests
      const requestPromises = [
        sessionManager.getOrCreateSession(mockUserId),
        sessionManager.getOrCreateSession(mockUserId),
        sessionManager.getOrCreateSession(mockUserId)
      ]

      // Advance timers to complete sandbox creation
      vi.advanceTimersByTime(100)

      const results = await Promise.all(requestPromises)

      // All should get the same sandbox
      expect(results[0]?.sandboxId).toBe(mockSandboxId)
      expect(results[1]?.sandboxId).toBe(mockSandboxId)
      expect(results[2]?.sandboxId).toBe(mockSandboxId)
      // Only one sandbox should have been created
      expect(mockSandboxCreate).toHaveBeenCalledTimes(1)
    })

    it('should create new sandbox if existing one has status "stopped"', async () => {
      const stoppedSandbox = createMockSandbox({ status: 'stopped' })
      const newSandbox = createMockSandbox({ sandboxId: 'sandbox-new-456' })

      mockSandboxCreate.mockResolvedValueOnce(stoppedSandbox)
      mockSandboxGet.mockResolvedValueOnce(stoppedSandbox)
      mockSandboxCreate.mockResolvedValueOnce(newSandbox)

      // First call creates sandbox
      await sessionManager.getOrCreateSession(mockUserId)

      // Second call finds stopped sandbox, should create new one
      const sandbox = await sessionManager.getOrCreateSession(mockUserId)

      expect(sandbox.sandboxId).toBe('sandbox-new-456')
      expect(mockSandboxCreate).toHaveBeenCalledTimes(2)
    })

    it('should create new sandbox if Sandbox.get throws', async () => {
      const mockSandbox = createMockSandbox()
      const newSandbox = createMockSandbox({ sandboxId: 'sandbox-new-789' })

      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockRejectedValueOnce(new Error('Sandbox not found'))
      mockSandboxCreate.mockResolvedValueOnce(newSandbox)

      // First call creates sandbox
      await sessionManager.getOrCreateSession(mockUserId)

      // Second call fails to get sandbox, should create new one
      const sandbox = await sessionManager.getOrCreateSession(mockUserId)

      expect(sandbox.sandboxId).toBe('sandbox-new-789')
      expect(mockSandboxCreate).toHaveBeenCalledTimes(2)
    })

    it('should handle failed sandbox status by creating new one', async () => {
      const failedSandbox = createMockSandbox({ status: 'failed' })
      const newSandbox = createMockSandbox({ sandboxId: 'sandbox-retry-123' })

      mockSandboxCreate.mockResolvedValueOnce(failedSandbox)
      mockSandboxGet.mockResolvedValueOnce(failedSandbox)
      mockSandboxCreate.mockResolvedValueOnce(newSandbox)

      // First call creates sandbox (which fails)
      await sessionManager.getOrCreateSession(mockUserId)

      // Second call should detect failed status and create new one
      const sandbox = await sessionManager.getOrCreateSession(mockUserId)

      expect(sandbox.sandboxId).toBe('sandbox-retry-123')
    })
  })

  describe('getSession', () => {
    it('should return null when no session exists', async () => {
      const session = await sessionManager.getSession(mockUserId)

      expect(session).toBeNull()
    })

    it('should return sandbox when session exists and is valid', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockResolvedValueOnce(mockSandbox)

      // Create session first
      await sessionManager.getOrCreateSession(mockUserId)

      // Get session
      const session = await sessionManager.getSession(mockUserId)

      expect(session).not.toBeNull()
      expect(session?.sandboxId).toBe(mockSandboxId)
    })

    it('should return null when sandbox status is not running', async () => {
      const stoppedSandbox = createMockSandbox({ status: 'stopped' })
      mockSandboxCreate.mockResolvedValueOnce(stoppedSandbox)
      mockSandboxGet.mockResolvedValueOnce(stoppedSandbox)

      // Create session first
      await sessionManager.getOrCreateSession(mockUserId)

      // Get session - should return null because sandbox is stopped
      const session = await sessionManager.getSession(mockUserId)

      expect(session).toBeNull()
    })
  })

  describe('invalidateSession', () => {
    it('should remove session from cache', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)

      // Create session first
      await sessionManager.getOrCreateSession(mockUserId)

      // Invalidate session
      await sessionManager.invalidateSession(mockUserId)

      // Session should no longer exist
      const session = await sessionManager.getSession(mockUserId)
      expect(session).toBeNull()
    })

    it('should stop the sandbox when invalidating', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockResolvedValueOnce(mockSandbox)

      // Create session first
      await sessionManager.getOrCreateSession(mockUserId)

      // Invalidate session
      await sessionManager.invalidateSession(mockUserId)

      expect(mockSandbox.stop).toHaveBeenCalled()
    })

    it('should handle invalidating non-existent session gracefully', async () => {
      // Should not throw
      await expect(sessionManager.invalidateSession('non-existent-user')).resolves.toBeUndefined()
    })

    it('should handle sandbox.stop errors gracefully', async () => {
      const mockSandbox = createMockSandbox()
      mockSandbox.stop = vi.fn().mockRejectedValueOnce(new Error('Stop failed'))
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockResolvedValueOnce(mockSandbox)

      // Create session first
      await sessionManager.getOrCreateSession(mockUserId)

      // Invalidate session - should not throw despite stop error
      await expect(sessionManager.invalidateSession(mockUserId)).resolves.toBeUndefined()
    })
  })

  describe('extendSession', () => {
    it('should extend sandbox timeout', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockResolvedValueOnce(mockSandbox)

      // Create session first
      await sessionManager.getOrCreateSession(mockUserId)

      // Extend session
      await sessionManager.extendSession(mockUserId)

      expect(mockSandbox.extendTimeout).toHaveBeenCalled()
    })

    it('should not throw when extending non-existent session', async () => {
      await expect(sessionManager.extendSession('non-existent-user')).resolves.toBeUndefined()
    })
  })

  describe('isSessionValid', () => {
    it('should return false when no session exists', async () => {
      const isValid = await sessionManager.isSessionValid(mockUserId)

      expect(isValid).toBe(false)
    })

    it('should return true when session exists and sandbox is running', async () => {
      const mockSandbox = createMockSandbox({ status: 'running' })
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockResolvedValueOnce(mockSandbox)

      // Create session first
      await sessionManager.getOrCreateSession(mockUserId)

      // Check validity
      const isValid = await sessionManager.isSessionValid(mockUserId)

      expect(isValid).toBe(true)
    })

    it('should return false when sandbox status is "stopped"', async () => {
      const mockSandbox = createMockSandbox({ status: 'running' })
      const stoppedSandbox = createMockSandbox({ status: 'stopped' })
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockResolvedValueOnce(stoppedSandbox)

      // Create session first
      await sessionManager.getOrCreateSession(mockUserId)

      // Check validity - sandbox has stopped
      const isValid = await sessionManager.isSessionValid(mockUserId)

      expect(isValid).toBe(false)
    })

    it('should return false when Sandbox.get throws', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockRejectedValueOnce(new Error('Connection failed'))

      // Create session first
      await sessionManager.getOrCreateSession(mockUserId)

      // Check validity - get fails
      const isValid = await sessionManager.isSessionValid(mockUserId)

      expect(isValid).toBe(false)
    })
  })

  describe('session isolation', () => {
    it('should maintain separate sessions for different users', async () => {
      const mockSandbox1 = createMockSandbox({ sandboxId: 'sandbox-user1' })
      const mockSandbox2 = createMockSandbox({ sandboxId: 'sandbox-user2' })

      mockSandboxCreate
        .mockResolvedValueOnce(mockSandbox1)
        .mockResolvedValueOnce(mockSandbox2)

      const sandbox1 = await sessionManager.getOrCreateSession('user-1')
      const sandbox2 = await sessionManager.getOrCreateSession('user-2')

      expect(sandbox1.sandboxId).toBe('sandbox-user1')
      expect(sandbox2.sandboxId).toBe('sandbox-user2')
      expect(mockSandboxCreate).toHaveBeenCalledTimes(2)
    })

    it('should not affect other users when invalidating one session', async () => {
      const mockSandbox1 = createMockSandbox({ sandboxId: 'sandbox-user1' })
      const mockSandbox2 = createMockSandbox({ sandboxId: 'sandbox-user2' })

      mockSandboxCreate
        .mockResolvedValueOnce(mockSandbox1)
        .mockResolvedValueOnce(mockSandbox2)

      mockSandboxGet.mockResolvedValue(mockSandbox2)

      await sessionManager.getOrCreateSession('user-1')
      await sessionManager.getOrCreateSession('user-2')

      // Invalidate user-1's session
      await sessionManager.invalidateSession('user-1')

      // user-1's session should be null
      const session1 = await sessionManager.getSession('user-1')
      expect(session1).toBeNull()

      // user-2's session should still exist
      const session2 = await sessionManager.getSession('user-2')
      expect(session2).not.toBeNull()
      expect(session2?.sandboxId).toBe('sandbox-user2')
    })
  })

  describe('cleanup', () => {
    it('should stop and remove all sessions', async () => {
      const mockSandbox1 = createMockSandbox({ sandboxId: 'sandbox-user1' })
      const mockSandbox2 = createMockSandbox({ sandboxId: 'sandbox-user2' })

      mockSandboxCreate
        .mockResolvedValueOnce(mockSandbox1)
        .mockResolvedValueOnce(mockSandbox2)

      mockSandboxGet
        .mockResolvedValueOnce(mockSandbox1)
        .mockResolvedValueOnce(mockSandbox2)

      await sessionManager.getOrCreateSession('user-1')
      await sessionManager.getOrCreateSession('user-2')

      // Cleanup all sessions
      await sessionManager.cleanup()

      expect(mockSandbox1.stop).toHaveBeenCalled()
      expect(mockSandbox2.stop).toHaveBeenCalled()

      // Both sessions should be gone
      const session1 = await sessionManager.getSession('user-1')
      const session2 = await sessionManager.getSession('user-2')
      expect(session1).toBeNull()
      expect(session2).toBeNull()
    })
  })

  describe('cleanupUserSession (for logout integration)', () => {
    it('should return void and be callable as fire-and-forget', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockResolvedValueOnce(mockSandbox)

      // Create session first
      await sessionManager.getOrCreateSession(mockUserId)

      // cleanupUserSession should return void (fire-and-forget pattern)
      const result = await sessionManager.cleanupUserSession(mockUserId)

      expect(result).toBeUndefined()
      expect(mockSandbox.stop).toHaveBeenCalled()
    })

    it('should not throw when user has no active session', async () => {
      // Calling cleanup for non-existent user should not throw
      await expect(
        sessionManager.cleanupUserSession('non-existent-user')
      ).resolves.toBeUndefined()
    })

    it('should handle sandbox.stop errors gracefully without throwing', async () => {
      const mockSandbox = createMockSandbox()
      mockSandbox.stop = vi.fn().mockRejectedValueOnce(new Error('Sandbox stop failed'))
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockResolvedValueOnce(mockSandbox)

      // Create session first
      await sessionManager.getOrCreateSession(mockUserId)

      // Should not throw even when stop fails (fire-and-forget)
      await expect(
        sessionManager.cleanupUserSession(mockUserId)
      ).resolves.toBeUndefined()
    })

    it('should remove session from cache after cleanup', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockResolvedValueOnce(mockSandbox)

      // Create session first
      await sessionManager.getOrCreateSession(mockUserId)

      // Cleanup user session
      await sessionManager.cleanupUserSession(mockUserId)

      // Session should be gone
      const session = await sessionManager.getSession(mockUserId)
      expect(session).toBeNull()
    })

    it('should handle Sandbox.get errors gracefully during cleanup', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockRejectedValueOnce(new Error('Sandbox not found'))

      // Create session first
      await sessionManager.getOrCreateSession(mockUserId)

      // Should not throw when Sandbox.get fails during cleanup
      await expect(
        sessionManager.cleanupUserSession(mockUserId)
      ).resolves.toBeUndefined()

      // Session should still be removed from cache
      const session = await sessionManager.getSession(mockUserId)
      expect(session).toBeNull()
    })

    it('should not affect other users sessions when cleaning up one user', async () => {
      const mockSandbox1 = createMockSandbox({ sandboxId: 'sandbox-user1' })
      const mockSandbox2 = createMockSandbox({ sandboxId: 'sandbox-user2' })

      mockSandboxCreate
        .mockResolvedValueOnce(mockSandbox1)
        .mockResolvedValueOnce(mockSandbox2)

      mockSandboxGet
        .mockResolvedValueOnce(mockSandbox1)
        .mockResolvedValue(mockSandbox2)

      await sessionManager.getOrCreateSession('user-1')
      await sessionManager.getOrCreateSession('user-2')

      // Cleanup only user-1
      await sessionManager.cleanupUserSession('user-1')

      // user-1 session should be gone
      const session1 = await sessionManager.getSession('user-1')
      expect(session1).toBeNull()
      expect(mockSandbox1.stop).toHaveBeenCalled()

      // user-2 session should still exist
      const session2 = await sessionManager.getSession('user-2')
      expect(session2).not.toBeNull()
      expect(session2?.sandboxId).toBe('sandbox-user2')
      expect(mockSandbox2.stop).not.toHaveBeenCalled()
    })
  })

  describe('getActiveSessionCount', () => {
    it('should return 0 when no sessions exist', () => {
      const count = sessionManager.getActiveSessionCount()
      expect(count).toBe(0)
    })

    it('should return correct count of active sessions', async () => {
      const mockSandbox1 = createMockSandbox({ sandboxId: 'sandbox-user1' })
      const mockSandbox2 = createMockSandbox({ sandboxId: 'sandbox-user2' })

      mockSandboxCreate
        .mockResolvedValueOnce(mockSandbox1)
        .mockResolvedValueOnce(mockSandbox2)

      await sessionManager.getOrCreateSession('user-1')
      await sessionManager.getOrCreateSession('user-2')

      const count = sessionManager.getActiveSessionCount()
      expect(count).toBe(2)
    })

    it('should decrement count after cleanup', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockResolvedValueOnce(mockSandbox)

      await sessionManager.getOrCreateSession(mockUserId)
      expect(sessionManager.getActiveSessionCount()).toBe(1)

      await sessionManager.cleanupUserSession(mockUserId)
      expect(sessionManager.getActiveSessionCount()).toBe(0)
    })
  })

  describe('hasActiveSession', () => {
    it('should return false when user has no session', () => {
      const hasSession = sessionManager.hasActiveSession(mockUserId)
      expect(hasSession).toBe(false)
    })

    it('should return true when user has an active session in cache', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)

      await sessionManager.getOrCreateSession(mockUserId)

      const hasSession = sessionManager.hasActiveSession(mockUserId)
      expect(hasSession).toBe(true)
    })

    it('should return false after session is cleaned up', async () => {
      const mockSandbox = createMockSandbox()
      mockSandboxCreate.mockResolvedValueOnce(mockSandbox)
      mockSandboxGet.mockResolvedValueOnce(mockSandbox)

      await sessionManager.getOrCreateSession(mockUserId)
      expect(sessionManager.hasActiveSession(mockUserId)).toBe(true)

      await sessionManager.cleanupUserSession(mockUserId)
      expect(sessionManager.hasActiveSession(mockUserId)).toBe(false)
    })
  })
})
