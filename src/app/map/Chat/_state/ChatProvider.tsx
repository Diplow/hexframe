'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { ChatEvent } from './_events/event.types';
import { useChatStateInternal } from './useChatState';

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

// Update the useChatState hook to use the context
export function useChatState() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatState must be used within ChatProvider');
  }
  return context;
}