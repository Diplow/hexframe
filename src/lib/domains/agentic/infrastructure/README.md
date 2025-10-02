# Agentic Infrastructure

## Mental Model
Like a postal service for AI operations - routes LLM requests through background queues, handles delivery retries, and manages the infrastructure needed for reliable asynchronous processing.

## Responsibilities
- Provides Inngest client setup for background job processing
- Defines background job functions for async LLM operations (generation, cancellation, cleanup)
- Manages job lifecycle states (pending → processing → completed/cancelled)
- Implements rate limiting and retry policies for LLM requests
- Handles job persistence and database operations for job results

## Non-Responsibilities
- LLM provider implementations → See `~/lib/domains/agentic/repositories/README.md`
- Business logic and context building → See `~/lib/domains/agentic/services/README.md`
- Queue message processing (Inngest subsystem) → See `./inngest/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.