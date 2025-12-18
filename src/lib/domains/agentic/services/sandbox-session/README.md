# Sandbox Session

## Mental Model
A hotel concierge for Vercel Sandboxes - instead of checking guests in and out for every interaction, it keeps their room reserved and remembers their key. When they return, they can pick up exactly where they left off without waiting for a new room setup. If their room has expired, the concierge transparently books a new one without the guest noticing.

## Responsibilities
- Maintain a cache of sandbox IDs keyed by user ID
- Handle reconnection to existing sandboxes via Vercel's `Sandbox.get()` API
- Prevent race conditions when multiple concurrent requests arrive for the same user
- Proactively extend sandbox timeout on each access to keep sandboxes alive
- Validate sandbox status before returning from cache
- Track session lifecycle metadata (created, expires, last used)
- Cleanup sandboxes when sessions are invalidated or on server shutdown

## Expiration Handling
The session manager transparently handles sandbox expiration:

- **`isSessionValid(userId)`**: Checks if a sandbox is still running (useful for health checks)
- **`extendSession(userId)`**: Explicitly extends the sandbox timeout without full reconnection
- **`getOrCreateSession(userId)`**: The primary method - automatically detects expired/stopped sandboxes and recreates them transparently. Callers don't need to handle expiration themselves.

## Session Cleanup
The session manager provides cleanup mechanisms for releasing sandbox resources:

### User Logout Cleanup
- **`cleanupUserSession(userId)`**: Fire-and-forget cleanup for user logout/disconnect scenarios. Removes the session from cache immediately, then attempts to stop the sandbox gracefully. Errors are caught silently to ensure logout never blocks on sandbox issues.

This method is integrated with the auth logout router using fire-and-forget pattern - the logout completes immediately while cleanup happens in the background.

### Utility Methods
- **`getActiveSessionCount()`**: Returns the number of sessions currently in the cache (useful for monitoring/debugging)
- **`hasActiveSession(userId)`**: Synchronous cache check to see if a user has a session entry (does not validate actual sandbox status)

### Full Cleanup
- **`cleanup()`**: Stops all sandboxes and clears the cache. Call on server shutdown.

## Non-Responsibilities
- Sandbox creation/configuration details -> See `~/lib/domains/agentic/repositories`
- AI conversation orchestration -> See `../README.md`
- MCP API key management -> See `~/lib/domains/iam/services/internal-api-key.service`
- Unit tests -> See `./__tests__/`

## Interface
See `index.ts` for the public API - the ONLY exports other subsystems can use:
- `SandboxSessionManager` - Main service class
- `SandboxSession` - Session metadata type
- `SandboxSessionManagerConfig` - Configuration type
- `ISandboxSessionManager` - Interface for dependency injection

See parent `dependencies.json` for what this subsystem can import.

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.
