'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useChatStateInternal } from '~/app/map/Chat/_state/useChatState';
import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';

// Define the shape of the chat context
type ChatContextValue = ReturnType<typeof useChatStateInternal>;

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

export function useChatState() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatState must be used within ChatProvider');
  }
  return context;
}