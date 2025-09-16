import type { ChatEvent, Message, SystemMessagePayload, UserMessagePayload, NavigationPayload } from '~/app/map/Chat/_state/_events/event.types';

/**
 * Handle basic message events
 */
export function handleBasicMessageEvents(event: ChatEvent, messages: Message[]) {
  switch (event.type) {
    case 'user_message': {
      const payload = event.payload as UserMessagePayload;
      if (payload && typeof payload === 'object' && 'text' in payload && typeof payload.text === 'string') {
        messages.push({
          id: event.id,
          content: payload.text,
          actor: event.actor,
          timestamp: event.timestamp,
        });
      }
      break;
    }

    case 'system_message': {
      const payload = event.payload as SystemMessagePayload;
      if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
        messages.push({
          id: event.id,
          content: payload.message,
          actor: event.actor,
          timestamp: event.timestamp,
        });
      }
      break;
    }

    case 'message': {
      const payload = event.payload as { content?: string; text?: string; actor?: string };
      if (payload && typeof payload === 'object') {
        const messageContent = (typeof payload.content === 'string' ? payload.content : '') ||
                               (typeof payload.text === 'string' ? payload.text : '') || '';
        messages.push({
          id: event.id,
          content: messageContent,
          actor: event.actor,
          timestamp: event.timestamp,
        });
      }
      break;
    }
  }
}

/**
 * Handle navigation events for messages
 */
export function handleNavigationMessages(event: ChatEvent, messages: Message[]) {
  if (event.type === 'navigation') {
    const payload = event.payload as NavigationPayload;
    if (!payload || typeof payload !== 'object' || !('toTileId' in payload) || !('toTileName' in payload)) {
      return;
    }
    const fromText = payload.fromTileName ? `from "${payload.fromTileName}" ` : '';
    const truncatedTileName = payload.toTileName.length > 25
      ? payload.toTileName.slice(0, 25) + '...'
      : payload.toTileName;
    const navigationLink = `[${truncatedTileName}](command:navigate:${payload.toTileId}:${encodeURIComponent(payload.toTileName)})`;
    messages.push({
      id: event.id,
      content: `📍 Navigated ${fromText}to **${navigationLink}**`,
      actor: 'system',
      timestamp: event.timestamp,
    });
  }
}