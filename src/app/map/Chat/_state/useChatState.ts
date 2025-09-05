import { useEffect, useReducer, useMemo, useCallback, useRef } from 'react';
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
} from './_events/event.creators';
import { chatSettings } from '~/app/map/Chat/_settings/chat-settings';

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
  const operations = useMemo(() => ({
    // Send a user message
    sendMessage(text: string) {
      dispatch(createUserMessageEvent(text));
    },

    // Send an assistant message
    sendAssistantMessage(text: string) {
      dispatch(createAssistantMessageEvent(text));
    },
    
    // Show AI response widget
    showAIResponseWidget(data: { jobId?: string; initialResponse?: string; model?: string }) {
      const widget = {
        id: `ai-response-${Date.now()}`,
        type: 'ai-response' as const,
        data,
        priority: 'info' as const,
        timestamp: new Date()
      }
      
      const event = {
        type: 'widget_created' as const,
        payload: { widget },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'assistant' as const
      }
      
      dispatch(event);
    },

    // Show MCP keys widget
    showMcpKeysWidget() {
      const widget = {
        id: `mcp-keys-${Date.now()}`,
        type: 'mcp-keys' as const,
        data: {},
        priority: 'action' as const,
        timestamp: new Date()
      }
      
      const event = {
        type: 'widget_created' as const,
        payload: { widget },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'system' as const
      }
      
      dispatch(event);
    },

    // Show a system message
    showSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
      dispatch(createSystemMessageEvent(message, level));
    },

    // Show edit widget for a tile
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

    // Show preview widget for a tile
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

    // Close a widget
    closeWidget(widgetId: string) {
      dispatch({
        type: 'widget_closed',
        payload: { widgetId },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'user',
      });
    },

    // Start an operation (shows confirmation widget)
    startOperation(operation: 'create' | 'update' | 'delete' | 'move' | 'swap', tileId?: string, data?: unknown) {
      dispatch(createOperationStartedEvent(operation, tileId, data));
    },

    // Clear the chat
    clearChat() {
      dispatch({
        type: 'clear_chat',
        payload: {},
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'system',
      });
    },
  }), [dispatch]);

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

// This file now only exports the internal implementation
// The public useChatState hook is exported from ChatProvider.tsx