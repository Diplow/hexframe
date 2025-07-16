import React from 'react';
import { TestProviders } from '~/test-utils/providers';
import { ChatCacheProvider } from '../Cache/ChatCacheProvider';
import { EventBusContext } from '~/app/map/Services/EventBus/event-bus-context';
import { debugLogger } from '~/lib/debug/debug-logger';
import type { MockEventBus } from '~/test-utils/event-bus';
import type { ChatEvent } from '../Cache/_events/event.types';

interface ChatTestProvidersProps {
  children: React.ReactNode;
  eventBus?: MockEventBus;
  initialChatEvents?: ChatEvent[];
  enableDebugLogger?: boolean;
}

/**
 * Test provider for Chat components that includes all required dependencies
 * 
 * Dependencies included:
 * - EventBus (mock or real)
 * - ChatCacheProvider 
 * - AuthProvider
 * - QueryClientProvider
 * - ThemeProvider
 * - DebugLogger configuration
 */
export function ChatTestProviders({
  children,
  eventBus,
  initialChatEvents = [],
  enableDebugLogger = false,
}: ChatTestProvidersProps) {
  // Configure debug logger for tests
  React.useEffect(() => {
    const originalSettings = debugLogger.getOptions();
    
    debugLogger.setOptions({
      enableConsole: enableDebugLogger,
      enableUI: false, // Never enable UI in tests
      maxBufferSize: 100, // Smaller buffer for tests
    });

    // Clear buffer before test
    debugLogger.clearBuffer();

    return () => {
      // Restore original settings
      debugLogger.setOptions(originalSettings);
      debugLogger.clearBuffer();
    };
  }, [enableDebugLogger]);

  // Get the event bus from the context
  const EventBusConsumer = ({ children: childrenProp }: { children: React.ReactNode }) => {
    const context = React.useContext(EventBusContext);
    if (!context) {
      throw new Error('EventBusContext not found');
    }
    
    return (
      <ChatCacheProvider 
        eventBus={context}
        initialEvents={initialChatEvents}
      >
        {childrenProp}
      </ChatCacheProvider>
    );
  };

  return (
    <TestProviders mockEventBus={eventBus}>
      <EventBusConsumer>
        {children}
      </EventBusConsumer>
    </TestProviders>
  );
}

// Helper to render with ChatTestProviders
export function renderWithChatProviders(
  ui: React.ReactElement,
  options: Omit<ChatTestProvidersProps, 'children'> = {}
) {
  return (
    <ChatTestProviders {...options}>
      {ui}
    </ChatTestProviders>
  );
}

/**
 * Helper to simulate events from other components
 */
export const simulateMapEvent = {
  tileSelected: (eventBus: MockEventBus, tileData: {
    id: string;
    title: string;
    description?: string;
    content?: string;
    coordId: string;
  }, openInEditMode?: boolean) => {
    eventBus.emit({
      type: 'map.tile_selected',
      source: 'map_cache',
      payload: {
        tileId: tileData.coordId,
        tileData,
        openInEditMode,
      },
      timestamp: new Date(),
    });
  },

  tileCreated: (eventBus: MockEventBus, tileId: string, tileName: string, coordId: string) => {
    eventBus.emit({
      type: 'map.tile_created',
      source: 'map_cache',
      payload: {
        tileId,
        tileName,
        coordId,
      },
      timestamp: new Date(),
    });
  },

  navigation: (eventBus: MockEventBus, fromId: string | undefined, toId: string, toName: string) => {
    eventBus.emit({
      type: 'map.navigation',
      source: 'map_cache',
      payload: {
        fromCenterId: fromId,
        toCenterId: toId,
        toCenterName: toName,
      },
      timestamp: new Date(),
    });
  },

  authRequired: (eventBus: MockEventBus, reason: string) => {
    eventBus.emit({
      type: 'auth.required',
      source: 'map_cache',
      payload: { reason },
      timestamp: new Date(),
    });
  },
  
  authLogout: (eventBus: MockEventBus) => {
    eventBus.emit({
      type: 'auth.logout',
      source: 'auth',
      payload: {},
      timestamp: new Date(),
    });
  },

  error: (eventBus: MockEventBus, error: string, context?: unknown) => {
    eventBus.emit({
      type: 'error.occurred',
      source: 'map_cache',
      payload: { error, context },
      timestamp: new Date(),
    });
  },
};