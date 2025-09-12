'use client';

import { useEffect, useReducer, useMemo, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
import { useEventBus } from '~/app/map/Services';
import type { ChatEvent, ChatUIState } from '~/app/map/Chat/_state/_events/event.types';
import type { AppEvent, TileData } from '~/app/map/types';
import { eventsReducer } from '~/app/map/Chat/_state/_reducers/events.reducer';
import { deriveVisibleMessages, deriveActiveWidgets } from '~/app/map/Chat/_state/_selectors/message.selectors';
import { validateAndTransformMapEvent } from '~/app/map/Chat/_state/_events/event.validators';
import { 
  createUserMessageEvent, 
  createSystemMessageEvent,
  createAssistantMessageEvent,
  createOperationStartedEvent 
} from '~/app/map/Chat/_state/_events/event.creators';
import { chatSettings } from '~/app/map/Chat/_settings/chat-settings';

/**
 * Message-related operations
 */
function _createMessageOperations(dispatch: (event: ChatEvent) => void) {
  return {
    sendMessage(text: string) {
      dispatch(createUserMessageEvent(text));
    },
    sendAssistantMessage(text: string) {
      dispatch(createAssistantMessageEvent(text));
    },
    showSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
      dispatch(createSystemMessageEvent(message, level));
    },
  };
}

/**
 * Widget-related operations
 */
function _createWidgetOperations(dispatch: (event: ChatEvent) => void) {
  return {
    showAIResponseWidget(data: { jobId?: string; initialResponse?: string; model?: string }) {
      const widget = {
        id: `ai-response-${Date.now()}`,
        type: 'ai-response' as const,
        data,
        priority: 'info' as const,
        timestamp: new Date()
      }
      dispatch({
        type: 'widget_created' as const,
        payload: { widget },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'assistant' as const
      });
    },
    showMcpKeysWidget() {
      const widget = {
        id: `mcp-keys-${Date.now()}`,
        type: 'mcp-keys' as const,
        data: {},
        priority: 'action' as const,
        timestamp: new Date()
      }
      dispatch({
        type: 'widget_created' as const,
        payload: { widget },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'system' as const
      });
    },
    closeWidget(widgetId: string) {
      dispatch({
        type: 'widget_closed',
        payload: { widgetId },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'user',
      });
    },
  };
}

/**
 * Tile-related operations
 */
function _createTileOperations(dispatch: (event: ChatEvent) => void) {
  return {
    showEditWidget(tile: TileData) {
      dispatch({
        type: 'tile_selected',
        payload: {
          tileId: tile.metadata.coordId,
          tileData: {
            id: tile.metadata.dbId.toString(),
            title: tile.data.name,
            description: tile.data.description,
            content: tile.data.description,
            coordId: tile.metadata.coordId,
          },
          openInEditMode: true,
        },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'system',
      });
    },
    showPreviewWidget(tile: TileData) {
      dispatch({
        type: 'tile_selected',
        payload: {
          tileId: tile.metadata.coordId,
          tileData: {
            id: tile.metadata.dbId.toString(),
            title: tile.data.name,
            description: tile.data.description,
            content: tile.data.description,
            coordId: tile.metadata.coordId,
          },
          openInEditMode: false,
        },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'system',
      });
    },
  };
}

/**
 * General operations
 */
function _createGeneralOperations(dispatch: (event: ChatEvent) => void) {
  return {
    startOperation(operation: 'create' | 'update' | 'delete' | 'move' | 'swap', tileId?: string, data?: unknown) {
      dispatch(createOperationStartedEvent(operation, tileId, data));
    },
    clearChat() {
      dispatch({
        type: 'clear_chat',
        payload: {},
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'system',
      });
    },
  };
}

/**
 * Custom hook for chat domain operations
 */
function useChatOperations(dispatch: (event: ChatEvent) => void) {
  return useMemo(() => ({
    ..._createMessageOperations(dispatch),
    ..._createWidgetOperations(dispatch),
    ..._createTileOperations(dispatch),
    ..._createGeneralOperations(dispatch),
  }), [dispatch]);
}

/**
 * Chat state hook - provides domain operations for chat functionality
 * This is internal to the Chat module and should not be used outside
 */
export function useChatStateInternal(initialEvents: ChatEvent[] = []) {
  const eventBus = useEventBus();
  const hasAddedWelcomeMessage = useRef(false);
  
  // Start with provided events or empty array (welcome message added after mount)
  const defaultEvents = initialEvents;
  
  // Use reducer to manage event log
  const [events, dispatchEvent] = useReducer(eventsReducer, defaultEvents);

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
  }, [dispatch, initialEvents.length]); // Run once on mount

  // Subscribe to events
  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    // Listen to all map events
    const unsubscribeMap = eventBus.on('map.*', (event: AppEvent) => {
      const chatEvent = validateAndTransformMapEvent(event);
      if (chatEvent) {
        dispatch(chatEvent);
      }
    });
    unsubscribes.push(unsubscribeMap);

    // Listen to auth events
    const unsubscribeAuth = eventBus.on('auth.*', (event: AppEvent) => {
      const chatEvent = validateAndTransformMapEvent(event);
      if (chatEvent) {
        dispatch(chatEvent);
      }
    });
    unsubscribes.push(unsubscribeAuth);

    // Listen to error events
    const unsubscribeError = eventBus.on('error.*', (event: AppEvent) => {
      const chatEvent = validateAndTransformMapEvent(event);
      if (chatEvent) {
        dispatch(chatEvent);
      }
    });
    unsubscribes.push(unsubscribeError);
    
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

  // Domain operations - these are the ONLY ways to interact with chat state
  const operations = useChatOperations(dispatch);

  return {
    // State (read-only)
    messages: state.visibleMessages,
    widgets: state.activeWidgets,
    events: state.events,
    
    // Operations (the only way to modify state)
    ...operations,
    
    // Note: dispatch is NOT exposed! Use the domain operations above
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

// Update the useChatState hook to use the context
export function useChatState() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatState must be used within ChatProvider');
  }
  return context;
}