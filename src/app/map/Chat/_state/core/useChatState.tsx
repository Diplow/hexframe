'use client';

import { createContext, useContext, useEffect, useReducer, useMemo, useCallback, useRef, type ReactNode } from 'react';
import type { ChatEvent, ChatUIState } from '~/app/map/Chat/_state/_events/event.types';
import { eventsReducer } from '~/app/map/Chat/_state/_reducers/events.reducer';
import { deriveVisibleMessages, deriveActiveWidgets } from '~/app/map/Chat/_state/_selectors/message.selectors';
import { useChatOperations } from '~/app/map/Chat/_state/_operations';
import { useEventSubscriptions } from '~/app/map/Chat/_state/_hooks/useEventSubscriptions';

/**
 * Chat state hook - provides domain operations for chat functionality
 * This is internal to the Chat module and should not be used outside
 * @internal - exported for testing only
 */
export function useChatStateInternal(initialEvents: ChatEvent[] = []) {
  const hasAddedWelcomeMessage = useRef(false);
  
  // Use reducer to manage event log
  const [events, dispatchEvent] = useReducer(eventsReducer, initialEvents);

  // Derive UI state from events
  const state = useMemo<ChatUIState>(() => ({
    events,
    visibleMessages: deriveVisibleMessages(events),
    activeWidgets: deriveActiveWidgets(events),
  }), [events]);

  // Internal dispatch function that creates proper event structure
  const dispatch = useCallback((event: ChatEvent) => {
    const fullEvent: ChatEvent = {
      ...event,
      id: event.id || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: event.timestamp || new Date(),
    };
    dispatchEvent(fullEvent);
  }, []);

  // Add welcome message after mount (client-side only to avoid hydration mismatch)
  useEffect(() => {
    if (!hasAddedWelcomeMessage.current && initialEvents.length === 0) {
      hasAddedWelcomeMessage.current = true;
      dispatch({
        type: 'message',
        payload: {
          text: 'Welcome to **HexFrame**! Navigate the map by clicking on tiles. Your messages will be sent to AI to help you explore and build your tile hierarchy.',
        },
        id: 'welcome-message',
        timestamp: new Date(),
        actor: 'assistant' as const,
      });
    }
  }, [dispatch, initialEvents.length]);

  // Subscribe to event bus
  useEventSubscriptions(dispatch);

  // Domain operations - these are the ONLY ways to interact with chat state
  const operations = useChatOperations(dispatch);

  return {
    // State (read-only)
    messages: state.visibleMessages,
    widgets: state.activeWidgets,
    events: state.events,

    // Operations (the only way to modify state)
    ...operations,
  };
}

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