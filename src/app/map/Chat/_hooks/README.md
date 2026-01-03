# _hooks

## Mental Model
Like the nervous system of the chat interface - specialized hooks that translate between the UI layer and various backend services (AI, streaming, cache), managing connection states and ensuring responsive real-time feedback.

## Responsibilities
- Provide SSE streaming client for real-time execution feedback via `useStreamingExecution`
- Route user messages to USER tile execution via `useAIChatIntegration`
- Dispatch typed streaming events to appropriate UI handlers
- Format chat discussion for AI context via `_discussion-formatter`

## Non-Responsibilities
- Chat state management -> See `../_state/README.md`
- UI rendering and display -> See `../Timeline/README.md`
- Backend streaming implementation -> See `~/server/api/streaming/`
- Event type definitions -> See `~/lib/domains/agentic/types/stream.types.ts`

## Public Hooks

### useStreamingExecution
SSE streaming client that connects to the backend streaming endpoint for real-time task execution updates.

**Purpose**: Manages an EventSource connection to `/api/streaming/execute` and dispatches typed events to callback handlers for live UI updates during hexframe task execution.

**Usage**:
```typescript
import { useStreamingExecution } from '~/app/map/Chat/_hooks/useStreamingExecution'

const { isStreaming, error, start, abort } = useStreamingExecution({
  taskCoords: 'userId,groupId:1,2,3',
  instruction: 'Optional runtime instruction',
  callbacks: {
    onTextDelta: (delta) => appendText(delta),
    onToolCallStart: (name, id, args) => showToolCall(name),
    onToolCallEnd: (id, result, error) => hideToolCall(id),
    onTileMutation: (event) => refreshTile(event.coordinates),
    onDone: (event) => handleComplete(event),
    onError: (event) => handleError(event)
  },
  autoStart: false  // Default: manual start
})
```

**Options**:
| Option | Type | Description |
|--------|------|-------------|
| `taskCoords` | `string` | Task coordinates in "userId,groupId:path" format |
| `instruction` | `string?` | Optional instruction to pass to execution |
| `callbacks` | `StreamingCallbacks` | Event handlers for streaming events |
| `autoStart` | `boolean?` | Auto-start on mount (default: false) |

**Return Value**:
| Property | Type | Description |
|----------|------|-------------|
| `isStreaming` | `boolean` | Whether connection is active |
| `error` | `string \| null` | Error message if connection failed |
| `start` | `() => void` | Start the SSE connection |
| `abort` | `() => void` | Close the SSE connection |

### useAIChatIntegration
Routes user messages to USER tile for AI execution.

**Purpose**: Watches for new user messages in the chat timeline and automatically routes non-command, non-@mention messages to the user's USER tile via the executeTask streaming flow.

**How it works**:
1. Monitors chat messages for new user inputs
2. Skips commands (messages starting with `/`) and @mentions (handled separately)
3. Gets user's USER tile coordinates (`{userId},0`)
4. Formats previous messages as discussion context
5. Executes task on USER tile with the message as instruction

## StreamEvent Types

Events are defined in `~/lib/domains/agentic/types/stream.types.ts` as a discriminated union:

| Event Type | Description | Key Fields |
|------------|-------------|------------|
| `text_delta` | Incremental LLM text output | `text: string` |
| `tool_call_start` | Tool invocation begins | `toolName`, `toolCallId`, `arguments` |
| `tool_call_delta` | Incremental tool argument streaming | `toolCallId`, `argumentsDelta` |
| `tool_call_end` | Tool call completes | `toolCallId`, `result?`, `error?` |
| `tile_mutation` | Hexframe tile changed | `mutation`, `coordinates`, `title?` |
| `error` | Stream error occurred | `code`, `message`, `recoverable` |
| `done` | Stream completed | `totalTokens?`, `durationMs?` |

## StreamingCallbacks Interface

```typescript
interface StreamingCallbacks {
  onTextDelta?: (delta: string) => void
  onToolCallStart?: (toolName: string, toolCallId: string, args: string) => void
  onToolCallDelta?: (toolCallId: string, delta: string) => void
  onToolCallEnd?: (toolCallId: string, result?: string, error?: string) => void
  onTileMutation?: (event: TileMutationEvent) => void
  onDone?: (event: StreamDoneEvent) => void
  onError?: (event: StreamErrorEvent) => void
}
```

## Integration with Chat System

The hooks integrate with the chat system through:

1. **Chat State** (`useChatState`): Hooks access shared chat state to add messages and show widgets
2. **Streaming Task Execution**: Routes messages to USER tile via `useStreamingTaskExecution`
3. **EventBus**: Tile mutations can trigger cache invalidation via system events

**Typical Flow**:
1. User types message in chat input
2. `useAIChatIntegration` detects new message, executes task on USER tile
3. `useStreamingExecution` connects to SSE endpoint
4. Events flow through callbacks to update UI in real-time
5. On completion, response is added to chat timeline

## Internal Modules

| Module | Purpose |
|--------|---------|
| `_streaming-utils.ts` | URL building, event parsing, handler creation |
| `_discussion-formatter.ts` | Format chat messages as discussion string |
