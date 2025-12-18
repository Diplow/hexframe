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
