'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ChatEvent } from './_events/event.types';
import { useChatStateInternal } from './useChatState';

// Define the shape of the chat context
interface ChatContextValue {
  messages: ReturnType<typeof useChatStateInternal>['messages'];
  widgets: ReturnType<typeof useChatStateInternal>['widgets'];
  events: ReturnType<typeof useChatStateInternal>['events'];
  sendMessage: ReturnType<typeof useChatStateInternal>['sendMessage'];
  showSystemMessage: ReturnType<typeof useChatStateInternal>['showSystemMessage'];
  showEditWidget: ReturnType<typeof useChatStateInternal>['showEditWidget'];
  showPreviewWidget: ReturnType<typeof useChatStateInternal>['showPreviewWidget'];
  closeWidget: ReturnType<typeof useChatStateInternal>['closeWidget'];
  startOperation: ReturnType<typeof useChatStateInternal>['startOperation'];
  clearChat: ReturnType<typeof useChatStateInternal>['clearChat'];
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: ReactNode;
  initialEvents?: ChatEvent[];
}

export function ChatProvider({ children, initialEvents = [] }: ChatProviderProps) {
  // Create a single instance of chat state
  const chatState = useChatStateInternal(initialEvents);

  return (
    <ChatContext.Provider value={chatState}>
      {children}
    </ChatContext.Provider>
  );
}

// Update the useChatState hook to use the context
export function useChatState() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatState must be used within ChatProvider');
  }
  return context;
}