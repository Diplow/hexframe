# Agentic Router

## Mental Model
Like a telephone switchboard operator - receives AI chat requests from the frontend, routes them to the appropriate AI services, manages queuing for busy periods, and delivers responses back to callers.

## Responsibilities
- Provide tRPC API endpoints for AI chat generation (`generateResponse`, `generateStreamingResponse`)
- Handle SDK async generator for streaming responses with proper chunk accumulation
- Handle job status polling and real-time subscription for queued operations (`getJobStatus`, `watchJobStatus`)
- Enforce verification-aware rate limiting for AI requests (10 req/5min verified, 3 req/5min unverified)
- Manage AI model discovery and listing (`getAvailableModels`)
- Bridge frontend chat interface with agentic domain services through proper context preparation

## Non-Responsibilities
- MCP tool definitions and implementation → See `~/app/services/mcp/` (HTTP MCP server)
- LLM provider logic and model implementations → See `~/lib/domains/agentic/README.md`
- Authentication and session management → See `~/server/api/trpc.ts` middleware
- Chat UI state and message rendering → See `~/app/map/README.md`
- Database schema and persistence → See `~/server/db/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.