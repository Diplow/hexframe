# Chat State Management

State management for the Chat feature using a reducer-based architecture.

## Structure

- **core/** - Core state definitions and reducer
- **_events/** - Event types and handlers (including streaming events)
- **_hooks/** - React hooks for state access
- **_operations/** - Complex operations and side effects
- **_reducers/** - State update logic
- **_selectors/** - State derivation and queries (including streaming message handlers)
- **docs/** - Documentation components and UI

## Architecture

This follows a unidirectional data flow pattern:
1. User actions dispatch events
2. Reducers update state
3. Selectors derive computed values
4. Hooks provide React integration
5. Operations handle complex async logic

## Streaming Support

The state system handles real-time streaming messages through specialized events:

| Event Type | Purpose |
|------------|---------|
| `streaming_message_start` | Initialize a new streaming message |
| `streaming_message_delta` | Append text content to active stream |
| `streaming_message_end` | Finalize message with complete content |
| `tool_call_start` | Begin tool call widget display |
| `tool_call_end` | Complete tool call with result/error |

**Key modules for streaming:**
- `_selectors/streaming-message-handlers.ts` - Builds in-progress messages from stream state
- `_operations/message-operations.ts` - Operations for streaming message manipulation
- `_events/event.types.ts` - Streaming event type definitions

## Usage

```typescript
import { useChatState, useChatOperations } from '~/app/map/Chat/_state';

function ChatComponent() {
  const { state, dispatch } = useChatState();
  const chatOps = useChatOperations();

  // Start streaming message
  chatOps.startStreamingMessage('stream-123');

  // Append content as it arrives
  chatOps.appendToStreamingMessage('stream-123', 'Hello');

  // Finalize when complete
  chatOps.finalizeStreamingMessage('stream-123', 'Hello world!');
}
```
