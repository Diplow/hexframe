import type { ChatMessage, Message } from '~/app/map/Chat';
import type { TileData } from '~/app/map/types';

export function _prepareMessagesForAI(messages: Message[], newMessage: string): ChatMessage[] {
  // Get current chat messages for context
  const chatMessages: ChatMessage[] = messages.map((msg: Message) => ({
    id: msg.id,
    type: msg.actor as 'user' | 'assistant' | 'system',
    content: msg.content,
    metadata: {
      timestamp: msg.timestamp
    }
  }));

  // Add the new user message
  chatMessages.push({
    id: `msg-${Date.now()}`,
    type: 'user',
    content: newMessage,
    metadata: {
      timestamp: new Date()
    }
  });

  return chatMessages;
}

export function _transformCacheState(cache: { itemsById: Record<string, TileData>; center: string | null }) {
  return {
    itemsById: cache.itemsById,
    currentCenter: cache.center ?? ''
  };
}
