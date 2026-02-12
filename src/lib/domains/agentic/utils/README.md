# Agentic Utils

## Mental Model

The utils subsystem provides stateless pure functions for the agentic domain. These utilities handle prompt generation and response parsing without any database, HTTP, or LLM dependencies.

## Responsibilities

- Generate hexplan content for parent and leaf tiles
- Parse agent responses to extract structured execution results
- Re-export prompt building functions from templates subsystem

## Non-Responsibilities

- Template rendering logic → See `~/lib/domains/agentic/templates`
- LLM communication → See `~/lib/domains/agentic/repositories`
- Database operations → See `~/lib/domains/mapping`

## Interface

**Public API** (see `index.ts`):

```typescript
// Prompt building (re-exported from templates)
function buildPrompt(data: PromptData): string

// Hexplan generation
function generateParentHexplanContent(
  structuralChildren: Array<{ title: string; coords: string }>,
  allLeafTasks?: Array<{ title: string; coords: string }>
): string

function generateLeafHexplanContent(
  taskTitle: string,
  instruction: string | undefined
): string

// Response parsing
function parseAgentResponse(response: string): AgentExecutionResult

interface AgentExecutionResult {
  result: 'completed' | 'blocked'
  reason?: string  // Required if blocked
}
```

## Response Parser

The `parseAgentResponse` utility extracts structured execution results from agent responses.

### Usage

```typescript
import { parseAgentResponse } from '~/lib/domains/agentic/utils'

const result = parseAgentResponse(agentResponse)
if (result.result === 'blocked') {
  console.log('Blocked:', result.reason)
}
```

### Status Block Format

Agents must end responses with a status block:

```xml
<status>{"result": "completed"}</status>
<!-- or -->
<status>{"result": "blocked", "reason": "description"}</status>
```

### Behavior

- **Valid status block**: Returns parsed result
- **Multiple status blocks**: Uses the last one (most recent)
- **Status block in code fence**: Ignored (prevents accidental parsing of examples)
- **No status block found**: Returns `{ result: 'completed' }` with console warning
- **Malformed JSON**: Returns `{ result: 'completed' }` with console warning

### Graceful Degradation

The parser is designed to be resilient. If parsing fails for any reason, it defaults to `{ result: 'completed' }` to avoid blocking execution. Warnings are logged for debugging.

## File Structure

```
utils/
├── index.ts                  # Public API exports
├── prompt-builder.ts         # Re-exports from templates + hexplan generators
├── _response-parser.ts       # Agent response parsing
└── __tests__/
    ├── prompt-builder.test.ts
    └── response-parser.test.ts
```

## Key Principles

- **Pure Functions**: No side effects, no external dependencies
- **Graceful Degradation**: Response parser fails safely
- **Single Responsibility**: Each utility has one clear purpose
