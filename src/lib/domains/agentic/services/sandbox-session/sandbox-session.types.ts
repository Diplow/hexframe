import type { Sandbox } from '@vercel/sandbox'

/**
 * Represents a cached sandbox session with lifecycle tracking metadata.
 * Note: stores sandboxId string, not sandbox object (survives serialization).
 */
export interface SandboxSession {
  /** Unique identifier for the sandbox (from Vercel) */
  sandboxId: string
  /** User ID this sandbox belongs to */
  userId: string
  /** When the session was created */
  createdAt: Date
  /** When the session is expected to expire (based on Vercel timeout) */
  expiresAt: Date
  /** When the session was last accessed */
  lastUsedAt: Date
  /** Current status of the session in our tracking */
  status: 'active' | 'expired' | 'invalidated'
}

/**
 * Configuration options for the session manager including auto-extend behavior
 */
export interface SandboxSessionManagerConfig {
  /** Default timeout for new sandboxes in milliseconds (default: 5 minutes) */
  defaultTimeoutMs: number
  /** How much to extend timeout on each access in milliseconds (default: 2 minutes) */
  extendOnAccessMs: number
  /** Maximum timeout allowed by Vercel (Hobby: 45 min, Pro: 5 hours) */
  maxTimeoutMs: number
}

/**
 * Interface for sandbox session manager.
 * Returns Sandbox objects but internally stores only sandboxId strings.
 */
export interface ISandboxSessionManager {
  /**
   * Get an existing session or create a new one for the user.
   * Uses Sandbox.get() for reconnection if session exists.
   * @param userId - The user ID
   * @returns A running Sandbox instance
   */
  getOrCreateSession(userId: string): Promise<Sandbox>

  /**
   * Get an existing session without creating a new one.
   * Returns null if no valid session exists.
   * @param userId - The user ID
   * @returns A running Sandbox instance or null
   */
  getSession(userId: string): Promise<Sandbox | null>

  /**
   * Invalidate and cleanup a user's session.
   * Stops the sandbox and removes from cache.
   * @param userId - The user ID
   */
  invalidateSession(userId: string): Promise<void>

  /**
   * Explicitly extend a session's timeout.
   * Called proactively to keep sandbox alive during long operations.
   * @param userId - The user ID
   */
  extendSession(userId: string): Promise<void>

  /**
   * Check if a session is valid (exists and sandbox is running).
   * @param userId - The user ID
   * @returns True if session exists and sandbox status is 'running'
   */
  isSessionValid(userId: string): Promise<boolean>

  /**
   * Cleanup all sessions. Call on server shutdown.
   */
  cleanup(): Promise<void>

  /**
   * Cleanup a user's session on logout/disconnect.
   * Fire-and-forget pattern: errors are caught gracefully.
   * @param userId - The user ID to cleanup
   */
  cleanupUserSession(userId: string): Promise<void>

  /**
   * Get the count of active sessions in the cache.
   * @returns Number of active sessions
   */
  getActiveSessionCount(): number

  /**
   * Check if a user has an active session in the cache (sync check, does not validate sandbox status).
   * @param userId - The user ID to check
   * @returns True if user has a session in cache
   */
  hasActiveSession(userId: string): boolean
}
