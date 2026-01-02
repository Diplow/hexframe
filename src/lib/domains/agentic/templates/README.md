# Agentic Templates

## Mental Model

The Templates subsystem is a "prompt factory" that transforms tile hierarchies into execution-ready XML prompts. Given structured data about a task (its ancestors, context children, subtasks, and hexplan), it selects the appropriate Mustache template based on the tile's `itemType` and renders it into a prompt that AI agents can execute.

Think of it like a document generator: you provide the data, it picks the right template, and outputs a formatted document ready for consumption.

## Responsibilities

- Select appropriate Mustache template based on `MapItemType` (SYSTEM, USER, CONTEXT, ORGANIZATIONAL)
- Transform `PromptData` into template-ready data structures
- Build XML sections for ancestors, context, subtasks, task, and hexplan
- Escape XML special characters to prevent injection
- Render templates using Mustache and clean up whitespace
- Enforce template availability (throw clear errors for unimplemented types)

## Non-Responsibilities

- Fetching tile data from database → See `~/lib/domains/mapping/services`
- Resolving hexplan content → See `~/server/api/routers/agentic.ts`
- Streaming LLM responses → See `~/lib/domains/agentic/services`
- Hexplan generation logic → See `~/lib/domains/agentic/utils/prompt-builder.ts`

## Interface

**Public API** (see `index.ts`):

```typescript
// Build execution-ready XML prompt from task data
function buildPrompt(data: PromptData): string

// Input data structure
interface PromptData {
  task: { title: string; content: string | undefined; coords: string }
  ancestors: Array<{ title: string; content: string | undefined; coords: string }>
  composedChildren: Array<{ title: string; content: string; coords: string }>
  structuralChildren: Array<{ title: string; preview: string | undefined; coords: string }>
  hexPlan: string
  mcpServerName: string
  allLeafTasks?: Array<{ title: string; coords: string }>
  itemType: MapItemType  // Required - determines which template to use
}
```

**Dependencies** (see `dependencies.json`):
- `mustache` - Template rendering engine
- `~/lib/domains/mapping` - For `MapItemType` enum

**Internal Files** (prefixed with `_`):
- `_prompt-builder.ts` - Core implementation (template lookup, data transformation, rendering)
- `_system-template.ts` - SYSTEM tile template string and constants

## Key Principles

- **Template per ItemType**: Each `MapItemType` has its own template. Currently only SYSTEM is implemented.
- **Clean Separation**: Templates know nothing about database, HTTP, or LLM concerns.
- **Fail Fast**: Unimplemented item types throw clear errors rather than falling back silently.
- **XML Output**: Prompts use XML tags for structured sections that agents can parse.
- **Minimal Public API**: Only `buildPrompt` and `PromptData` are exported. All internals are hidden.
