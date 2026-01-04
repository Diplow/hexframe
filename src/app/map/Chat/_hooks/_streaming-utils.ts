/**
 * Internal utilities for streaming execution
 * @module _streaming-utils
 */

import type React from 'react'
import type {
  StreamEvent,
  TileMutationEvent,
  StreamErrorEvent,
  StreamDoneEvent
} from '~/lib/domains/agentic'

/** Callback handlers for streaming events */
export interface StreamingCallbacks {
  onPromptGenerated?: (prompt: string) => void
  onTextDelta?: (delta: string) => void
  onToolCallStart?: (toolName: string, toolCallId: string, args: string) => void
  onToolCallDelta?: (toolCallId: string, delta: string) => void
  onToolCallEnd?: (toolCallId: string, result?: string, error?: string) => void
  onTileMutation?: (event: TileMutationEvent) => void
  onDone?: (event: StreamDoneEvent) => void
  onError?: (event: StreamErrorEvent) => void
}

/** Internal refs type for connection management */
export interface ConnectionRefs {
  eventSource: React.RefObject<EventSource | null>
  isMounted: React.RefObject<boolean>
  callbacks: React.RefObject<StreamingCallbacks>
}

const STREAMING_ENDPOINT = '/api/stream/execute-task'

/** Options for building the streaming URL */
export interface StreamingUrlOptions {
  taskCoords: string
  instruction?: string
  discussion?: string
}

/** Build the EventSource URL with query parameters */
export function _buildStreamingUrl(options: StreamingUrlOptions): string {
  const params = new URLSearchParams()
  params.set('taskCoords', options.taskCoords)
  if (options.instruction) params.set('instruction', options.instruction)
  if (options.discussion) params.set('discussion', options.discussion)
  return `${STREAMING_ENDPOINT}?${params.toString()}`
}

/** Parse SSE data into a typed StreamEvent */
export function _parseStreamEvent(data: string): StreamEvent | null {
  try {
    const parsed: unknown = JSON.parse(data)
    if (typeof parsed !== 'object' || parsed === null) return null
    const event = parsed as Record<string, unknown>
    if (typeof event.type !== 'string') return null
    return parsed as unknown as StreamEvent
  } catch {
    return null
  }
}

/** Dispatch a stream event to the appropriate callback handler */
export function _dispatchStreamEvent(
  event: StreamEvent,
  callbacks: StreamingCallbacks
): { shouldClose: boolean; error?: string } {
  switch (event.type) {
    case 'prompt_generated':
      callbacks.onPromptGenerated?.(event.prompt)
      return { shouldClose: false }
    case 'text_delta':
      callbacks.onTextDelta?.(event.text)
      return { shouldClose: false }
    case 'tool_call_start':
      callbacks.onToolCallStart?.(event.toolName, event.toolCallId, event.arguments)
      return { shouldClose: false }
    case 'tool_call_delta':
      callbacks.onToolCallDelta?.(event.toolCallId, event.argumentsDelta)
      return { shouldClose: false }
    case 'tool_call_end':
      callbacks.onToolCallEnd?.(event.toolCallId, event.result, event.error)
      return { shouldClose: false }
    case 'tile_mutation':
      callbacks.onTileMutation?.(event)
      return { shouldClose: false }
    case 'done':
      callbacks.onDone?.(event)
      return { shouldClose: true }
    case 'error':
      callbacks.onError?.(event)
      return { shouldClose: !event.recoverable, error: event.message }
    default:
      // Handle unknown event types gracefully
      return { shouldClose: false }
  }
}

/** State setters for handler creation */
export interface StateSetters {
  setError: (error: string | null) => void
  setIsStreaming: (streaming: boolean) => void
}

/** Create message handler for SSE events */
export function _createMessageHandler(refs: ConnectionRefs, state: StateSetters) {
  return (messageEvent: MessageEvent) => {
    if (!refs.isMounted.current) return
    const event = _parseStreamEvent(messageEvent.data as string)
    if (!event) return

    const result = _dispatchStreamEvent(event, refs.callbacks.current!)
    if (result.error) state.setError(result.error)
    if (result.shouldClose) {
      refs.eventSource.current?.close()
      if (refs.isMounted.current) state.setIsStreaming(false)
    }
  }
}

/** Create error handler for EventSource */
export function _createErrorHandler(refs: ConnectionRefs, state: StateSetters) {
  return () => {
    if (!refs.isMounted.current) return
    state.setError('Connection error')
    state.setIsStreaming(false)
    refs.eventSource.current?.close()
  }
}
