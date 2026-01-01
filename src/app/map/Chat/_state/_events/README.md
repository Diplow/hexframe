# Chat State Events

## Mental Model
Events are the "vocabulary" of the chat system - typed messages that describe what happened. Think of them as form letters: each type has a specific structure that validators ensure is correct before the system processes them.

## Responsibilities
- Define event types and their payload structures
- Create event instances with correct shapes
- Validate incoming events match expected formats
- Transform raw data into typed events

## Non-Responsibilities
- Event dispatching -> See `../README.md`
- State mutations -> See `../_reducers/README.md`
- Event bus infrastructure -> See `~/app/map/Services/EventBus`

## Streaming Events

The following events support real-time streaming execution:

| Event | Payload | Purpose |
|-------|---------|---------|
| `streaming_message_start` | `{ streamId, model? }` | Initialize new streaming message |
| `streaming_message_delta` | `{ streamId, delta }` | Append text chunk to stream |
| `streaming_message_end` | `{ streamId, finalContent, usage? }` | Finalize message with complete content |
| `tool_call_start` | `{ streamId, toolCallId, toolName, arguments }` | Begin tool call widget |
| `tool_call_end` | `{ streamId, toolCallId, result, success }` | Complete tool call with result |

These events are dispatched by `useChatOperations` methods when processing SSE callbacks from `useStreamingExecution`.

## Interface
See `index.ts` for the public API - the ONLY exports other subsystems can use.
See `dependencies.json` for what this subsystem can import.
