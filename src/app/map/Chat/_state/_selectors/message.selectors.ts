import type { ChatEvent, Message } from '~/app/map/Chat/_state/_events/event.types';
import { chatSettings } from '~/app/map/Chat/_settings/chat-settings';
import { handleBasicMessageEvents, handleNavigationMessages } from '~/app/map/Chat/_state/_selectors/basic-message-handlers';
import { handleOperationMessages } from '~/app/map/Chat/_state/_selectors/operation-message-handlers';
import {
  handleStreamingMessageEvents,
  buildInProgressStreamingMessages,
  type StreamingMessageState,
} from '~/app/map/Chat/_state/_selectors/streaming-message-handlers';

// Events that are handled explicitly (not shown as debug messages)
const HANDLED_EVENT_TYPES = [
  'user_message',
  'system_message',
  'message',
  'operation_completed',
  'navigation',
  'streaming_message_start',
  'streaming_message_delta',
  'streaming_message_end',
  'tool_call_start',
  'tool_call_end',
];

/**
 * Derive visible messages from events
 * Messages are derived from events that represent communication
 */
export function deriveVisibleMessages(events: ChatEvent[]): Message[] {
  const messages: Message[] = [];
  const settings = chatSettings.getSettings();
  // Track streaming message state during derivation
  const streamingState = new Map<string, StreamingMessageState>();

  for (const event of events) {
    // Try different message handlers
    handleBasicMessageEvents(event, messages);
    handleOperationMessages(event, messages, settings);
    handleNavigationMessages(event, messages);
    handleStreamingMessageEvents(event, messages, streamingState);

    // Handle debug messages if enabled (for events not handled by other handlers)
    if (settings.messages.debug && !HANDLED_EVENT_TYPES.includes(event.type)) {
      messages.push({
        id: `debug-${event.id}`,
        content: `[DEBUG] Chat Event: **${event.type}** | Actor: ${event.actor} | Data: \`${JSON.stringify(event.payload)}\``,
        actor: 'system',
        timestamp: event.timestamp,
      });
    }
  }

  // Add in-progress streaming messages (not yet finalized)
  const inProgressMessages = buildInProgressStreamingMessages(streamingState);
  messages.push(...inProgressMessages);

  return messages;
}

// Re-export the widget selector
export { deriveActiveWidgets } from '~/app/map/Chat/_state/_selectors/widget-selectors';