/**
 * Type definitions for streaming events
 *
 * These types define the contract between backend (emitter) and frontend (consumer)
 * for real-time streaming updates during task execution. All types use discriminated
 * unions with a 'type' field for type-safe event handling.
 */

/**
 * Coordinates for a hexframe tile
 * Matches the coordinate format used in contracts.ts
 */
export interface TileCoordinates {
  userId: string
  groupId: number
  path: number[]
}

// ============================================================================
// Individual Event Types
// ============================================================================

/**
 * Incremental text content from LLM response
 */
export interface TextDeltaEvent {
  type: 'text_delta'
  /** The incremental text content */
  text: string
}

/**
 * The hexecute prompt sent to the LLM
 * Emitted before streaming begins so the UI can display it
 */
export interface PromptGeneratedEvent {
  type: 'prompt_generated'
  /** The full XML prompt sent to the LLM */
  prompt: string
}

/**
 * Indicates a tool call has begun
 */
export interface ToolCallStartEvent {
  type: 'tool_call_start'
  /** Unique identifier for this tool call */
  toolCallId: string
  /** Name of the tool being called */
  toolName: string
  /** JSON-serialized arguments (may be partial if streaming) */
  arguments: string
}

/**
 * Incremental updates to tool call arguments
 * Used when tool arguments are streamed progressively
 */
export interface ToolCallDeltaEvent {
  type: 'tool_call_delta'
  /** Identifier correlating to the original tool_call_start */
  toolCallId: string
  /** Incremental argument content */
  argumentsDelta: string
}

/**
 * Tool call completion with result or error
 */
export interface ToolCallEndEvent {
  type: 'tool_call_end'
  /** Identifier correlating to the original tool_call_start */
  toolCallId: string
  /** Tool name for context */
  toolName?: string
  /** The tool's arguments (JSON-serialized) - accumulated from streaming deltas */
  arguments?: string
  /** The tool's result (JSON-serialized) */
  result?: string
  /** Error message if the tool call failed */
  error?: string
}

/**
 * Hexframe tile mutation event
 * Emitted when hexframe MCP tools (addItem, updateItem, deleteItem) are called
 */
export interface TileMutationEvent {
  type: 'tile_mutation'
  /** Type of mutation performed */
  mutation: 'create' | 'update' | 'delete'
  /** Coordinates of the affected tile */
  coordinates: TileCoordinates
  /** Title of the tile (for create/update) */
  title?: string
  /** Preview text of the tile (for create/update) */
  preview?: string
}

/**
 * Known error codes for stream errors
 * Using uppercase to match LLMError conventions from llm.types.ts
 */
export type StreamErrorCode =
  | 'RATE_LIMIT'
  | 'INVALID_API_KEY'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'STREAM_INTERRUPTED'
  | 'TIMEOUT'
  | 'UNKNOWN'

/**
 * Error event during streaming
 */
export interface StreamErrorEvent {
  type: 'error'
  /**
   * Error code for programmatic handling
   * Uses string to allow for extensibility; prefer StreamErrorCode values
   */
  code: string
  /** Human-readable error message */
  message: string
  /** Whether the client can attempt recovery (e.g., reconnect) */
  recoverable: boolean
}

/**
 * Stream completion signal
 */
export interface StreamDoneEvent {
  type: 'done'
  /** Total tokens used (if available) */
  totalTokens?: number
  /** Stream duration in milliseconds */
  durationMs?: number
}

// ============================================================================
// Discriminated Union
// ============================================================================

/**
 * Union type of all streaming events
 *
 * Use discriminated union pattern for type-safe event handling:
 * ```typescript
 * function handleEvent(event: StreamEvent) {
 *   switch (event.type) {
 *     case 'text_delta':
 *       console.log(event.text);
 *       break;
 *     case 'tool_call_start':
 *       console.log(`Tool ${event.toolName} started`);
 *       break;
 *     // ... handle other event types
 *   }
 * }
 * ```
 */
export type StreamEvent =
  | TextDeltaEvent
  | PromptGeneratedEvent
  | ToolCallStartEvent
  | ToolCallDeltaEvent
  | ToolCallEndEvent
  | TileMutationEvent
  | StreamErrorEvent
  | StreamDoneEvent

/**
 * Extract the type discriminant from StreamEvent
 * Useful for switch statements and type guards
 */
export type StreamEventType = StreamEvent['type']

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for text delta events
 */
export function isTextDeltaEvent(event: StreamEvent): event is TextDeltaEvent {
  return event.type === 'text_delta'
}

/**
 * Type guard for prompt generated events
 */
export function isPromptGeneratedEvent(event: StreamEvent): event is PromptGeneratedEvent {
  return event.type === 'prompt_generated'
}

/**
 * Type guard for tool call events (start, delta, or end)
 */
export function isToolCallEvent(
  event: StreamEvent
): event is ToolCallStartEvent | ToolCallDeltaEvent | ToolCallEndEvent {
  return (
    event.type === 'tool_call_start' ||
    event.type === 'tool_call_delta' ||
    event.type === 'tool_call_end'
  )
}

/**
 * Type guard for tile mutation events
 */
export function isTileMutationEvent(event: StreamEvent): event is TileMutationEvent {
  return event.type === 'tile_mutation'
}

/**
 * Type guard for stream completion (done or error)
 */
export function isStreamTerminalEvent(
  event: StreamEvent
): event is StreamDoneEvent | StreamErrorEvent {
  return event.type === 'done' || event.type === 'error'
}
