import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';

/**
 * Create a streaming message start event
 */
export function createStreamingMessageStartEvent(streamId: string, model?: string): ChatEvent {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'streaming_message_start',
    payload: { streamId, model },
    timestamp: new Date(),
    actor: 'assistant',
  };
}

/**
 * Create a streaming message delta event
 */
export function createStreamingMessageDeltaEvent(streamId: string, delta: string): ChatEvent {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'streaming_message_delta',
    payload: { streamId, delta },
    timestamp: new Date(),
    actor: 'assistant',
  };
}

/**
 * Create a streaming message end event
 */
export function createStreamingMessageEndEvent(
  streamId: string,
  finalContent: string,
  usage?: { inputTokens?: number; outputTokens?: number }
): ChatEvent {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'streaming_message_end',
    payload: { streamId, finalContent, usage },
    timestamp: new Date(),
    actor: 'assistant',
  };
}

/**
 * Create a streaming message prompt event
 * Sets the hexecute prompt for the streaming message
 */
export function createStreamingMessagePromptEvent(streamId: string, prompt: string): ChatEvent {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'streaming_message_prompt',
    payload: { streamId, prompt },
    timestamp: new Date(),
    actor: 'assistant',
  };
}

/**
 * Create a tool call start event
 */
export function createToolCallStartEvent(
  streamId: string,
  toolCallId: string,
  toolName: string,
  toolArguments: Record<string, unknown>
): ChatEvent {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'tool_call_start',
    payload: { streamId, toolCallId, toolName, arguments: toolArguments },
    timestamp: new Date(),
    actor: 'assistant',
  };
}

/**
 * Create a tool call end event
 */
export function createToolCallEndEvent(
  streamId: string,
  toolCallId: string,
  result: string,
  success: boolean
): ChatEvent {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: 'tool_call_end',
    payload: { streamId, toolCallId, result, success },
    timestamp: new Date(),
    actor: 'assistant',
  };
}
