import { SandboxSessionManager } from '~/lib/domains/agentic/services/sandbox-session/sandbox-session-manager.service'
import { createSessionStore } from '~/lib/domains/agentic/services/sandbox-session/session-store-factory'

export { SandboxSessionManager }
export type {
  SandboxSession,
  SandboxSessionManagerConfig,
  ISandboxSessionManager
} from '~/lib/domains/agentic/services/sandbox-session/sandbox-session.types'
export type { ISessionStore } from '~/lib/domains/agentic/services/sandbox-session/redis-session-store'
export { MemorySessionStore, RedisSessionStore } from '~/lib/domains/agentic/services/sandbox-session/redis-session-store'
export { createSessionStore } from '~/lib/domains/agentic/services/sandbox-session/session-store-factory'

const DEFAULT_TIMEOUT_SECONDS = 5 * 60 // 5 minutes

/**
 * Singleton instance of SandboxSessionManager for application-wide session management.
 * Uses Redis for persistence if UPSTASH_REDIS_REST_URL is configured,
 * otherwise falls back to in-memory storage.
 */
export const sandboxSessionManager = new SandboxSessionManager(
  {
    defaultTimeoutMs: DEFAULT_TIMEOUT_SECONDS * 1000,
    extendOnAccessMs: 2 * 60 * 1000, // 2 minutes
    maxTimeoutMs: 45 * 60 * 1000 // 45 minutes (Hobby tier limit)
  },
  createSessionStore(DEFAULT_TIMEOUT_SECONDS)
)
