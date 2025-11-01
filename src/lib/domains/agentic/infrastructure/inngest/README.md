# Inngest Queue Infrastructure

## Mental Model

This subsystem is the "job queue orchestrator" for LLM operations - it handles long-running AI requests that might timeout on serverless platforms, similar to how a background job processor (like Sidekiq or Bull) handles async tasks in traditional web apps.

## Responsibilities

- Create and configure the Inngest client for event-driven background jobs
- Define background job functions for LLM generation with retry logic and rate limiting
- Support both OpenRouter (fetch-based) and Claude Agent SDK (async generator) repositories
- Queue LLM generation requests with automatic retries (up to 3 attempts)
- Throttle concurrent requests per user to prevent rate limit violations
- Handle job cancellation and cleanup of old completed jobs
- Generate tile previews asynchronously using configured LLM provider
- Store job results and status in the database for client polling

## Non-Responsibilities

- LLM API calls → See `~/lib/domains/agentic/repositories/README.md` (delegated to repository layer)
- Job result polling → See `~/server/api/routers/agentic/README.md` (handled by tRPC API)
- Database schema → See `~/server/db/README.md` (schema defined separately)
- Provider selection logic → Configured via `LLM_PROVIDER` environment variable in `~/env.js`

## Interface

**Exports**: See parent `infrastructure/index.ts` for public API:
- `inngest`: Inngest client instance for event dispatching
- `inngestFunctions`: Array of all background job functions for registration

**Key Background Jobs**:
- `generateLLMResponse`: Main LLM generation with queuing, retries, and cancellation support
- `generatePreview`: Tile preview generation with faster throttling limits
- `cancelLLMJob`: Handle job cancellation requests
- `cleanupOldJobs`: Daily cleanup of jobs older than 7 days (runs at 2 AM)

**SDK Compatibility**:
Both OpenRouter (fetch with ReadableStream) and Claude Agent SDK (async generators) are fully compatible with Inngest's `step.run()` function. Async generators work seamlessly without timeout issues or special handling.

**Dependencies**: See `dependencies.json` for allowed imports.

**Note**: This subsystem is leaf-level (no child subsystems). It can be imported by API routes and other infrastructure layers via the parent `infrastructure/index.ts` exports only.
