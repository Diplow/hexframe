import type {
  ChatEvent,
  Message,
  StreamingMessageStartPayload,
  StreamingMessageDeltaPayload,
  StreamingMessageEndPayload,
} from '~/app/map/Chat/_state/_events/event.types';

/**
 * State for tracking streaming messages during derivation
 */
export interface StreamingMessageState {
  content: string;
  startEventId: string;
  timestamp: Date;
  model?: string;
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

      // Add finalized message to messages array with isStreaming: false
      const finalizedMessage = {
        id: messageId,
        content: messageContent,
        actor: 'assistant' as const,
        timestamp: messageTimestamp,
        isStreaming: false,
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
    // Include all streaming messages, even if empty (to show "streaming" indicator)
    inProgressMessages.push({
      id: `streaming-${streamId}`,
      content: state.content,
      actor: 'assistant',
      timestamp: state.timestamp,
      isStreaming: true,
    });
  }

  return inProgressMessages;
}
