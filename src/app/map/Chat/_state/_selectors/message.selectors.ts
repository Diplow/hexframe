import type { ChatEvent, Message } from '~/app/map/Chat/_state/_events/event.types';
import { chatSettings } from '~/app/map/Chat/_settings/chat-settings';
import { handleBasicMessageEvents, handleNavigationMessages } from '~/app/map/Chat/_state/_selectors/basic-message-handlers';
import { handleOperationMessages } from '~/app/map/Chat/_state/_selectors/operation-message-handlers';

/**
 * Derive visible messages from events
 * Messages are derived from events that represent communication
 */
export function deriveVisibleMessages(events: ChatEvent[]): Message[] {
  const messages: Message[] = [];
  const settings = chatSettings.getSettings();

  for (const event of events) {
    // Try different message handlers
    handleBasicMessageEvents(event, messages);
    handleOperationMessages(event, messages, settings);
    handleNavigationMessages(event, messages);

    // Handle debug messages if enabled (for events not handled by other handlers)
    if (settings.messages.debug &&
        !['user_message', 'system_message', 'message', 'operation_completed', 'navigation'].includes(event.type)) {
      messages.push({
        id: `debug-${event.id}`,
        content: `[DEBUG] Chat Event: **${event.type}** | Actor: ${event.actor} | Data: \`${JSON.stringify(event.payload)}\``,
        actor: 'system',
        timestamp: event.timestamp,
      });
    }
  }

  return messages;
}

// Re-export the widget selector
export { deriveActiveWidgets } from '~/app/map/Chat/_state/_selectors/widget-selectors';