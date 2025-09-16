'use client';

import React, { createContext, useContext } from 'react';
import type { EventBusService } from '~/app/map/types';
import { eventBus as defaultEventBus } from '~/app/map/Services/EventBus/event-bus';

/**
 * Context for the EventBus service
 */
const EventBusContext = createContext<EventBusService | null>(null);

/**
 * Provider component that makes the EventBus available to child components
 */
export function EventBusProvider({
  children,
  eventBus = defaultEventBus,
}: {
  children: React.ReactNode;
  eventBus?: EventBusService;
}) {
  return (
    <EventBusContext.Provider value={eventBus}>
      {children}
    </EventBusContext.Provider>
  );
}

/**
 * Hook to access the EventBus service
 * 
 * @example
 * const eventBus = useEventBus();
 * 
 * // Emit an event
 * eventBus.emit({
 *   type: 'map.tile_created',
 *   source: 'map_cache',
 *   payload: { tileId: '123' }
 * });
 * 
 * // Subscribe to events
 * useEffect(() => {
 *   const unsubscribe = eventBus.on('map.tile_created', (event) => {
 *     console.log('Tile created:', event.payload);
 *   });
 *   return unsubscribe;
 * }, [eventBus]);
 */
export function useEventBus(): EventBusService {
  const context = useContext(EventBusContext);
  if (!context) {
    throw new Error('useEventBus must be used within an EventBusProvider');
  }
  return context;
}

// Export context for advanced use cases
export { EventBusContext };