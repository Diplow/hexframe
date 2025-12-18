import { SandboxSessionManager } from '~/lib/domains/agentic/services/sandbox-session/sandbox-session-manager.service'

export { SandboxSessionManager }
export type {
  SandboxSession,
  SandboxSessionManagerConfig,
  ISandboxSessionManager
} from '~/lib/domains/agentic/services/sandbox-session/sandbox-session.types'

/**
 * Singleton instance of SandboxSessionManager for application-wide session management.
 * Uses sensible defaults for timeout configuration.
 */
export const sandboxSessionManager = new SandboxSessionManager({
  defaultTimeoutMs: 5 * 60 * 1000, // 5 minutes
  extendOnAccessMs: 2 * 60 * 1000, // 2 minutes
  maxTimeoutMs: 45 * 60 * 1000 // 45 minutes (Hobby tier limit)
})
