import type {
  ChatEvent,
  Message,
  StreamingMessageStartPayload,
  StreamingMessageDeltaPayload,
  StreamingMessageEndPayload,
  StreamingMessagePromptPayload,
  ToolCallStartPayload,
  ToolCallEndPayload,
  ToolCallData,
} from '~/app/map/Chat/_state/_events';

/**
 * State for tracking a single tool call during streaming
 */
interface StreamingToolCallState {
  toolCallId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  status: 'running' | 'completed' | 'failed';
  result?: string;
}

/**
 * State for tracking streaming messages during derivation
 */
export interface StreamingMessageState {
  content: string;
  startEventId: string;
  timestamp: Date;
  model?: string;
  /** The hexecute prompt for task executions */
  prompt?: string;
  /** Tool calls that occurred during this stream */
  toolCalls: Map<string, StreamingToolCallState>;
}

/**
 * Handle streaming message events and build in-progress messages
 *
 * This function processes streaming events and maintains state for active streams.
 * - streaming_message_start: Initializes a new streaming message
 * - streaming_message_delta: Appends content to the current stream
 * - streaming_message_end: Finalizes the message and clears the stream state
 */
export function handleStreamingMessageEvents(
  event: ChatEvent,
  messages: Message[],
  streamingState: Map<string, StreamingMessageState>
): void {
  switch (event.type) {
    case 'streaming_message_start': {
      const payload = event.payload as StreamingMessageStartPayload;
      if (!payload || typeof payload !== 'object' || !('streamId' in payload)) {
        return;
      }
      // Initialize new streaming message state
      streamingState.set(payload.streamId, {
        content: '',
        startEventId: event.id,
        timestamp: event.timestamp,
        model: payload.model,
        toolCalls: new Map(),
      });
      break;
    }

    case 'streaming_message_delta': {
      const payload = event.payload as StreamingMessageDeltaPayload;
      if (!payload || typeof payload !== 'object' || !('streamId' in payload) || !('delta' in payload)) {
        return;
      }
      const currentState = streamingState.get(payload.streamId);
      if (currentState) {
        // Append delta to accumulated content
        currentState.content += payload.delta;
      }
      break;
    }

    case 'streaming_message_prompt': {
      const payload = event.payload as StreamingMessagePromptPayload;
      if (!payload || typeof payload !== 'object' || !('streamId' in payload) || !('prompt' in payload)) {
        return;
      }
      const currentState = streamingState.get(payload.streamId);
      if (currentState) {
        currentState.prompt = payload.prompt;
      }
      break;
    }

    case 'tool_call_start': {
      const payload = event.payload as ToolCallStartPayload;
      if (!payload || typeof payload !== 'object' || !('streamId' in payload) || !('toolCallId' in payload)) {
        return;
      }
      const currentState = streamingState.get(payload.streamId);
      if (currentState) {
        // Add new tool call to the stream's tool calls
        currentState.toolCalls.set(payload.toolCallId, {
          toolCallId: payload.toolCallId,
          toolName: payload.toolName,
          arguments: payload.arguments ?? {},
          status: 'running',
        });
      }
      break;
    }

    case 'tool_call_end': {
      const payload = event.payload as ToolCallEndPayload;
      if (!payload || typeof payload !== 'object' || !('streamId' in payload) || !('toolCallId' in payload)) {
        return;
      }
      const currentState = streamingState.get(payload.streamId);
      if (currentState) {
        const toolCall = currentState.toolCalls.get(payload.toolCallId);
        if (toolCall) {
          // Update tool call status and result
          toolCall.status = payload.success ? 'completed' : 'failed';
          toolCall.result = payload.result;
        }
      }
      break;
    }

    case 'streaming_message_end': {
      const payload = event.payload as StreamingMessageEndPayload;
      if (!payload || typeof payload !== 'object' || !('streamId' in payload)) {
        return;
      }
      // Use final content from the end event (more reliable than accumulated deltas)
      const streamState = streamingState.get(payload.streamId);
      const messageContent = payload.finalContent ?? streamState?.content ?? '';
      const messageTimestamp = streamState?.timestamp ?? event.timestamp;
      const messageId = streamState?.startEventId ?? event.id;

      // Convert tool calls Map to array for the message
      const toolCalls: ToolCallData[] = streamState?.toolCalls
        ? Array.from(streamState.toolCalls.values())
        : [];

      // Add finalized message to messages array with isStreaming: false
      const finalizedMessage: Message & { isStreaming: false } = {
        id: messageId,
        content: messageContent,
        actor: 'assistant' as const,
        timestamp: messageTimestamp,
        isStreaming: false,
        prompt: streamState?.prompt,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
      messages.push(finalizedMessage);

      // Clean up streaming state
      streamingState.delete(payload.streamId);
      break;
    }
  }
}

/**
 * Build in-progress streaming messages from current streaming state
 * These are temporary messages shown while streaming is active
 */
export function buildInProgressStreamingMessages(
  streamingState: Map<string, StreamingMessageState>
): (Message & { isStreaming?: boolean })[] {
  const inProgressMessages: (Message & { isStreaming?: boolean })[] = [];

  for (const [streamId, state] of streamingState.entries()) {
    // Convert tool calls Map to array for the message
    const toolCalls: ToolCallData[] = state.toolCalls
      ? Array.from(state.toolCalls.values())
      : [];

    // Include all streaming messages, even if empty (to show "streaming" indicator)
    inProgressMessages.push({
      id: `streaming-${streamId}`,
      content: state.content,
      actor: 'assistant',
      timestamp: state.timestamp,
      isStreaming: true,
      prompt: state.prompt,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    });
  }

  return inProgressMessages;
}
