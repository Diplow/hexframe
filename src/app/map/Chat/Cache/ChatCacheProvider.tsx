import { createContext, useContext, useEffect, useReducer, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { EventBus } from '../../Services/event-bus';
import type { ChatEvent, ChatUIState } from './_events/event.types';
import type { AppEvent } from '../../types/events';
import { eventsReducer } from './_reducers/events.reducer';
import { deriveVisibleMessages, deriveActiveWidgets } from './_selectors/message.selectors';
import { createChatEventFromMapEvent } from './_events/event.creators';
import { chatSettings } from '../_settings/chat-settings';

interface ChatCacheContextValue {
  state: ChatUIState;
  dispatch: (event: ChatEvent) => void;
  eventBus: EventBus;
}

const ChatCacheContext = createContext<ChatCacheContextValue | null>(null);

interface ChatCacheProviderProps {
  children: ReactNode;
  eventBus: EventBus;
  initialEvents?: ChatEvent[];
}

export function ChatCacheProvider({
  children,
  eventBus,
  initialEvents = [],
}: ChatCacheProviderProps) {
  // Use reducer to manage event log
  const [events, dispatchEvent] = useReducer(eventsReducer, initialEvents);

  // Derive UI state from events
  const state = useMemo<ChatUIState>(() => ({
    events,
    visibleMessages: deriveVisibleMessages(events),
    activeWidgets: deriveActiveWidgets(events),
  }), [events]);

  // Dispatch function that creates proper event structure
  const dispatch = useCallback((event: ChatEvent) => {
    const fullEvent: ChatEvent = {
      ...event,
      id: event.id || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: event.timestamp || new Date(),
    };
    dispatchEvent(fullEvent);
  }, []);

  // Chat components should not log their own renders to prevent circular dependencies
  
  // Subscribe to map events
  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    // Listen to all map events
    const unsubscribeMap = eventBus.on('map.*', (event: AppEvent) => {
      const chatEvent = createChatEventFromMapEvent(event);
      if (chatEvent) {
        dispatch(chatEvent);
      }
    });
    unsubscribes.push(unsubscribeMap);

    // Listen to auth events
    const unsubscribeAuth = eventBus.on('auth.*', (event: AppEvent) => {
      const chatEvent = createChatEventFromMapEvent(event);
      if (chatEvent) {
        dispatch(chatEvent);
      }
    });
    unsubscribes.push(unsubscribeAuth);

    // Listen to error events
    const unsubscribeError = eventBus.on('error.*', (event: AppEvent) => {
      const chatEvent = createChatEventFromMapEvent(event);
      if (chatEvent) {
        dispatch(chatEvent);
      }
    });
    unsubscribes.push(unsubscribeError);
    
    // Debug logging is now handled by the debug logger itself, not through events
    // This prevents circular dependencies and re-render loops
    
    // Listen to ALL events for debug mode (excluding debug.log to avoid duplication)
    const unsubscribeAll = eventBus.on('*', (event: AppEvent) => {
      if (chatSettings.getSettings().messages.debug && event.type !== 'debug.log') {
        // Create a debug message for all bus events
        dispatch({
          type: 'message',
          payload: {
            content: `[DEBUG] EventBus: **${event.type}** | Source: ${event.source} | Data: \`${JSON.stringify(event.payload)}\``,
            actor: 'system',
          },
          id: `debug-${event.type}-${Date.now()}`,
          timestamp: event.timestamp ?? new Date(),
          actor: 'system',
        });
      }
    });
    unsubscribes.push(unsubscribeAll);

    // Cleanup
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [eventBus, dispatch]);

  const value = useMemo(() => ({
    state,
    dispatch,
    eventBus,
  }), [state, dispatch, eventBus]);

  return (
    <ChatCacheContext.Provider value={value}>
      {children}
    </ChatCacheContext.Provider>
  );
}

export function useChatCache() {
  const context = useContext(ChatCacheContext);
  if (!context) {
    throw new Error('useChatCache must be used within ChatCacheProvider');
  }
  return context;
}