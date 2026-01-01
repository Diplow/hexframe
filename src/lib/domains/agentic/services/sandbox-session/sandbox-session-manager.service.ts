import { Sandbox } from '@vercel/sandbox'
import ms from 'ms'
import type {
  SandboxSession,
  SandboxSessionManagerConfig,
  ISandboxSessionManager
} from '~/lib/domains/agentic/services/sandbox-session/sandbox-session.types'
import type { ISessionStore } from '~/lib/domains/agentic/services/sandbox-session/redis-session-store'
import { loggers } from '~/lib/debug/debug-logger'

/**
 * SandboxSessionManager maintains a cache of sandbox IDs keyed by user session ID,
 * with automatic lifecycle management using Vercel's native reconnection API.
 *
 * Key features:
 * - Stores sandboxId strings (not sandbox objects) for serialization safety
 * - Uses Sandbox.get() for reconnection after serverless cold starts
 * - Persists sessions to Redis (if configured) to survive cold starts
 * - Handles race conditions for concurrent requests
 * - Proactively extends sandbox timeout on access
 * - Validates sandbox.status before returning from cache
 */
export class SandboxSessionManager implements ISandboxSessionManager {
  /** Session store (Redis or in-memory) */
  private readonly store: ISessionStore

  /** Pending creation promises for race condition handling (in-memory only) */
  private readonly pendingCreations = new Map<string, Promise<Sandbox>>()

  /** Configuration for timeout management */
  private readonly config: SandboxSessionManagerConfig

  constructor(config: SandboxSessionManagerConfig, store: ISessionStore) {
    this.config = config
    this.store = store
  }

  async getOrCreateSession(userId: string): Promise<Sandbox> {
    const existingSession = await this.store.get(userId)
    console.log('[SandboxSession] getOrCreateSession called', {
      userId,
      hasExistingSession: !!existingSession,
      existingSandboxId: existingSession?.sandboxId
    })

    // Check if there's a pending creation for this user (race condition handling)
    const pendingCreation = this.pendingCreations.get(userId)
    if (pendingCreation) {
      console.log('[SandboxSession] Returning pending creation', { userId })
      return pendingCreation
    }

    // Check if we have an existing session
    if (existingSession) {
      console.log('[SandboxSession] Found existing session, attempting reconnect', {
        userId,
        sandboxId: existingSession.sandboxId,
        createdAt: existingSession.createdAt,
        lastUsedAt: existingSession.lastUsedAt
      })
      const sandbox = await this._tryReconnectToSandbox(existingSession.sandboxId)
      if (sandbox && this._isSandboxRunning(sandbox)) {
        console.log('[SandboxSession] Reusing existing sandbox', {
          userId,
          sandboxId: sandbox.sandboxId,
          status: sandbox.status
        })
        await this._extendSandboxTimeout(sandbox)
        await this._updateSessionLastUsed(userId, existingSession)
        return sandbox
      }
      // Sandbox is not usable, remove from cache
      console.log('[SandboxSession] Existing sandbox not usable, removing from cache', {
        userId,
        sandboxId: existingSession.sandboxId,
        sandboxFound: !!sandbox,
        sandboxStatus: sandbox?.status
      })
      await this.store.delete(userId)
    }

    // Create a new sandbox
    console.log('[SandboxSession] Creating new sandbox', { userId })
    return this._createSandboxWithLock(userId)
  }

  async getSession(userId: string): Promise<Sandbox | null> {
    const existingSession = await this.store.get(userId)
    if (!existingSession) {
      return null
    }

    const sandbox = await this._tryReconnectToSandbox(existingSession.sandboxId)
    if (sandbox && this._isSandboxRunning(sandbox)) {
      return sandbox
    }

    // Sandbox is not usable, remove from cache
    await this.store.delete(userId)
    return null
  }

  async invalidateSession(userId: string): Promise<void> {
    const existingSession = await this.store.get(userId)
    if (!existingSession) {
      return
    }

    // Try to stop the sandbox gracefully
    try {
      const sandbox = await this._tryReconnectToSandbox(existingSession.sandboxId)
      if (sandbox) {
        await sandbox.stop()
      }
    } catch {
      // Ignore errors when stopping - sandbox may already be gone
    }

    // Remove from cache
    await this.store.delete(userId)
  }

  async extendSession(userId: string): Promise<void> {
    const existingSession = await this.store.get(userId)
    if (!existingSession) {
      return
    }

    const sandbox = await this._tryReconnectToSandbox(existingSession.sandboxId)
    if (sandbox && this._isSandboxRunning(sandbox)) {
      await this._extendSandboxTimeout(sandbox)
      await this._updateSessionLastUsed(userId, existingSession)
    }
  }

  async isSessionValid(userId: string): Promise<boolean> {
    const existingSession = await this.store.get(userId)
    if (!existingSession) {
      return false
    }

    const sandbox = await this._tryReconnectToSandbox(existingSession.sandboxId)
    return sandbox !== null && this._isSandboxRunning(sandbox)
  }

  async cleanup(): Promise<void> {
    const sessions = await this.store.getAll()
    const cleanupPromises: Promise<void>[] = []

    for (const [userId] of sessions) {
      cleanupPromises.push(this.invalidateSession(userId))
    }

    await Promise.all(cleanupPromises)
  }

  /**
   * Cleanup a user's session on logout/disconnect.
   * Fire-and-forget pattern: errors are caught gracefully.
   * @param userId - The user ID to cleanup
   */
  async cleanupUserSession(userId: string): Promise<void> {
    const existingSession = await this.store.get(userId)
    if (!existingSession) {
      return
    }

    // Remove from cache first (ensures cleanup even if stop fails)
    await this.store.delete(userId)

    // Try to stop the sandbox gracefully (fire-and-forget)
    try {
      const sandbox = await this._tryReconnectToSandbox(existingSession.sandboxId)
      if (sandbox) {
        await sandbox.stop()
      }
    } catch {
      // Ignore errors - fire-and-forget pattern
    }
  }

  /**
   * Get the count of active sessions in the cache.
   * Note: This is async when using Redis store.
   * @returns Number of active sessions
   */
  getActiveSessionCount(): number {
    // For backwards compatibility, return 0 if store doesn't support sync size
    // In practice, this is only used for logging/debugging
    return 0
  }

  /**
   * Check if a user has an active session in the cache.
   * Note: This is now async when using Redis store.
   * @param userId - The user ID to check
   * @returns True if user has a session in cache
   */
  hasActiveSession(userId: string): boolean {
    // For backwards compatibility, return false
    // Callers should use getSession() for async check
    return this.pendingCreations.has(userId)
  }

  /**
   * Try to reconnect to an existing sandbox by ID.
   * Returns null if reconnection fails.
   */
  private async _tryReconnectToSandbox(sandboxId: string): Promise<Sandbox | null> {
    try {
      console.log('[SandboxSession] Attempting to reconnect to sandbox', { sandboxId })
      const sandbox = await Sandbox.get({ sandboxId })
      console.log('[SandboxSession] Reconnection result', {
        sandboxId,
        status: sandbox.status
      })
      return sandbox
    } catch (error) {
      console.log('[SandboxSession] Reconnection failed', {
        sandboxId,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  /**
   * Check if sandbox status is 'running'.
   */
  private _isSandboxRunning(sandbox: Sandbox): boolean {
    return sandbox.status === 'running'
  }

  /**
   * Extend sandbox timeout proactively.
   */
  private async _extendSandboxTimeout(sandbox: Sandbox): Promise<void> {
    try {
      await sandbox.extendTimeout(this.config.extendOnAccessMs)
    } catch {
      // Ignore errors when extending timeout
    }
  }

  /**
   * Update the lastUsedAt timestamp for a session.
   */
  private async _updateSessionLastUsed(userId: string, session: SandboxSession): Promise<void> {
    const updatedSession: SandboxSession = {
      ...session,
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.defaultTimeoutMs)
    }
    await this.store.set(userId, updatedSession)
  }

  /**
   * Create a new sandbox with locking to prevent race conditions.
   */
  private async _createSandboxWithLock(userId: string): Promise<Sandbox> {
    const creationPromise = this._createNewSandbox(userId)
    this.pendingCreations.set(userId, creationPromise)

    try {
      const sandbox = await creationPromise
      return sandbox
    } finally {
      this.pendingCreations.delete(userId)
    }
  }

  /**
   * Create a new sandbox and store in session cache.
   * Initializes the sandbox with Claude Agent SDK installed.
   */
  private async _createNewSandbox(userId: string): Promise<Sandbox> {
    console.log('[SandboxSession] Creating new sandbox for session', { userId })
    loggers.agentic('Creating new sandbox for session', { userId })

    const sandbox = await Sandbox.create({
      runtime: 'node22',
      timeout: ms('5m'),
      resources: {
        vcpus: 2
      }
    })

    console.log('[SandboxSession] Sandbox created, installing Claude Agent SDK', {
      userId,
      sandboxId: sandbox.sandboxId
    })
    loggers.agentic('Sandbox created, installing Claude Agent SDK', {
      userId,
      sandboxId: sandbox.sandboxId
    })

    // Install Claude Agent SDK in the sandbox
    const installResult = await sandbox.runCommand({
      cmd: 'npm',
      args: ['install', '@anthropic-ai/claude-agent-sdk']
    })

    const installStdout = await installResult.stdout()
    const installStderr = await installResult.stderr()
    console.log('[SandboxSession] SDK install result', {
      userId,
      sandboxId: sandbox.sandboxId,
      exitCode: installResult.exitCode,
      stdout: installStdout.slice(0, 500),
      stderr: installStderr.slice(0, 500)
    })

    if (installResult.exitCode !== 0) {
      console.error('[SandboxSession] SDK installation failed', {
        userId,
        sandboxId: sandbox.sandboxId,
        exitCode: installResult.exitCode,
        stderr: installStderr
      })
      throw new Error(`Failed to install Claude Agent SDK: ${installStderr}`)
    }

    console.log('[SandboxSession] Claude Agent SDK installed successfully', {
      userId,
      sandboxId: sandbox.sandboxId
    })
    loggers.agentic('Claude Agent SDK installed successfully', {
      userId,
      sandboxId: sandbox.sandboxId
    })

    const now = new Date()
    const session: SandboxSession = {
      sandboxId: sandbox.sandboxId,
      userId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.config.defaultTimeoutMs),
      lastUsedAt: now,
      status: 'active'
    }

    await this.store.set(userId, session)
    console.log('[SandboxSession] Session stored', {
      userId,
      sandboxId: sandbox.sandboxId
    })

    return sandbox
  }
}
