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
- Orchestrate SYSTEM tile execution via the `run` mutation

## run Mutation

Execute the next step of a SYSTEM tile hierarchy.

### Usage Pattern

```typescript
// External orchestration loop
let result = await trpc.agentic.run({ coords: 'userId,0:6' })

while (!result.isComplete) {
  if (result.runStatus === 'blocked') {
    // Handle blockage (notify user, wait for fix)
    await waitForUserIntervention()
  }
  result = await trpc.agentic.run({ coords: 'userId,0:6' })
}

console.log('Run complete!')
```

### How It Works

1. **Validation**: Verifies the tile is a SYSTEM type (or custom type)
2. **Run Management**: Gets or creates a run object for the root coords
3. **Leaf Discovery**: Uses `LeafTraversalService` to find the next incomplete leaf
4. **Execution**: Builds hexecute prompt and calls agentic service
5. **Status Parsing**: Extracts completion/blockage status from agent response
6. **State Update**: Updates run with step result

### Return Type

```typescript
interface RunResult {
  runId: string           // Unique identifier for this run
  runStatus: 'open' | 'blocked' | 'closed'
  stepExecuted: string | null  // Coords of step just executed
  stepResult: 'completed' | 'blocked' | null
  blockageReason: string | null
  response: string | null      // Agent's response text
  isComplete: boolean          // True if run is now closed
}
```

### MCP Usage

```
mcp__hexframe__run({ coords: "userId,0:6" })
// Returns: { runId, runStatus, stepExecuted, isComplete, ... }
```

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