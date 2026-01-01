# Server API

## Mental Model
Like a telephone switchboard operator that routes type-safe calls between clients and backend services, while maintaining caller identity across call sessions.

## Responsibilities
- Configure and initialize the tRPC framework with context, middleware, and transformers
- Combine domain-specific routers into a unified AppRouter for the entire application
- Provide type-safe API contracts and context creation for client-server communication
- Export the public interface that other subsystems use to access tRPC functionality
- Derive sandbox session IDs from authentication context for persistent Vercel sandbox sessions

## Sandbox Session ID Derivation

The `deriveSandboxSessionId` function in `trpc.ts` determines the session identifier used for persistent sandbox sessions based on authentication method:

| Auth Method | Session ID Source | Example |
|-------------|-------------------|---------|
| Web UI (better-auth session) | `session.id` | `sess_abc123...` |
| Internal API key | `userId + "-api-key"` | `user123-api-key` |
| External API key | `userId + "-api-key"` | `user456-api-key` |
| Anonymous | `undefined` | Ephemeral sandbox |

The `agenticServiceMiddleware` uses this derived session ID when creating the `AgenticService`, enabling:
- Persistent sandbox sessions within the same user session
- Automatic sandbox reuse across chat messages
- Clean separation between authenticated and anonymous sandbox lifecycles

## Non-Responsibilities
- Route-specific business logic → See `./routers/README.md`
- Rate limiting middleware → See `./middleware/README.md`
- API type contracts → See `./types/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.