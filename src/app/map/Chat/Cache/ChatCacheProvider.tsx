import type { ReactNode } from 'react';
import type { ChatEvent } from './_events/event.types';
import type { EventBusService } from '../../types/events';
import { useChatCacheOperations } from './hooks/useChatCacheOperations';

interface ChatCacheProviderProps {
  children: ReactNode;
  eventBus: EventBusService;
  initialEvents?: ChatEvent[];
}

/**
 * @deprecated ChatCacheProvider is deprecated. Components should use useChatState directly.
 * This is now just a compatibility wrapper that renders children without any context.
 */
export function ChatCacheProvider({
  children,
  eventBus: _eventBus,
  initialEvents: _initialEvents = [],
}: ChatCacheProviderProps) {
  // Just render children - the state is now managed by useChatState hook
  return <>{children}</>;
}

/**
 * @deprecated Use useChatState from _state/useChatState.ts directly
 * This is a compatibility layer that will be removed
 */
export function useChatCache() {
  // Return the compatibility layer
  const ops = useChatCacheOperations();
  return {
    state: {
      visibleMessages: ops.messages,
      activeWidgets: ops.widgets,
      events: ops.events,
    },
    dispatch: ops.dispatch,
    eventBus: ops.eventBus,
  };
}