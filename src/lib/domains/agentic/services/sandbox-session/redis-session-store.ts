import type { Redis } from '@upstash/redis'
import type { SandboxSession } from '~/lib/domains/agentic/services/sandbox-session/sandbox-session.types'

/**
 * Redis-backed session store for sandbox session persistence.
 * Survives serverless cold starts by storing session data in Upstash Redis.
 */
export interface ISessionStore {
  get(userId: string): Promise<SandboxSession | null>
  set(userId: string, session: SandboxSession): Promise<void>
  delete(userId: string): Promise<void>
  getAll(): Promise<Map<string, SandboxSession>>
}

/**
 * In-memory fallback store for when Redis is not configured.
 * Used in local development without Redis.
 */
export class MemorySessionStore implements ISessionStore {
  private readonly sessions = new Map<string, SandboxSession>()

  async get(userId: string): Promise<SandboxSession | null> {
    return this.sessions.get(userId) ?? null
  }

  async set(userId: string, session: SandboxSession): Promise<void> {
    this.sessions.set(userId, session)
  }

  async delete(userId: string): Promise<void> {
    this.sessions.delete(userId)
  }

  async getAll(): Promise<Map<string, SandboxSession>> {
    return new Map(this.sessions)
  }
}

/**
 * Redis-backed session store using Upstash Redis.
 * Sessions are stored with a TTL matching the sandbox timeout.
 */
export class RedisSessionStore implements ISessionStore {
  private readonly redis: Redis
  private readonly keyPrefix = 'sandbox-session:'
  private readonly defaultTtlSeconds: number

  constructor(redis: Redis, defaultTtlSeconds = 300) {
    this.redis = redis
    this.defaultTtlSeconds = defaultTtlSeconds
  }

  private _getKey(userId: string): string {
    return `${this.keyPrefix}${userId}`
  }

  async get(userId: string): Promise<SandboxSession | null> {
    try {
      const data = await this.redis.get<SandboxSession>(this._getKey(userId))
      if (!data) return null

      // Reconstruct Date objects from stored strings
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        expiresAt: new Date(data.expiresAt),
        lastUsedAt: new Date(data.lastUsedAt)
      }
    } catch (error) {
      console.error('[RedisSessionStore] Failed to get session', { userId, error })
      return null
    }
  }

  async set(userId: string, session: SandboxSession): Promise<void> {
    try {
      // Calculate TTL based on session expiry
      const ttlMs = session.expiresAt.getTime() - Date.now()
      const ttlSeconds = Math.max(Math.ceil(ttlMs / 1000), this.defaultTtlSeconds)

      await this.redis.set(this._getKey(userId), session, { ex: ttlSeconds })
      console.log('[RedisSessionStore] Session stored', {
        userId,
        sandboxId: session.sandboxId,
        ttlSeconds
      })
    } catch (error) {
      console.error('[RedisSessionStore] Failed to set session', { userId, error })
      throw error
    }
  }

  async delete(userId: string): Promise<void> {
    try {
      await this.redis.del(this._getKey(userId))
      console.log('[RedisSessionStore] Session deleted', { userId })
    } catch (error) {
      console.error('[RedisSessionStore] Failed to delete session', { userId, error })
    }
  }

  async getAll(): Promise<Map<string, SandboxSession>> {
    // Note: This is expensive and should only be used for cleanup
    // In production, consider using Redis SCAN instead
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`)
      const sessions = new Map<string, SandboxSession>()

      for (const key of keys) {
        const userId = key.replace(this.keyPrefix, '')
        const session = await this.get(userId)
        if (session) {
          sessions.set(userId, session)
        }
      }

      return sessions
    } catch (error) {
      console.error('[RedisSessionStore] Failed to get all sessions', { error })
      return new Map()
    }
  }
}

// Factory function moved to session-store-factory.ts to follow Rule of 6
