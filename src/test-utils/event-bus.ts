import { vi } from 'vitest';
import type { AppEvent, EventListener, EventBusService } from '~/lib/utils/event-bus';

/**
 * Creates a mock EventBus for testing
 * 
 * The mock tracks all emitted events and registered listeners,
 * making it easy to assert on event interactions in tests.
 */
export interface MockEventBus extends EventBusService {
  emit: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  getListenerCount: ReturnType<typeof vi.fn>;
  emittedEvents: AppEvent[];
}

export function createMockEventBus(): MockEventBus {
  const emittedEvents: AppEvent[] = [];
  const listeners = new Map<string, Set<EventListener>>();

  const mockEventBus = {
    emit: vi.fn((event: AppEvent) => {
      emittedEvents.push(event);
      
      // Simulate real event emission to listeners (for integration tests)
      const eventListeners = listeners.get(event.type);
      if (eventListeners) {
        eventListeners.forEach(listener => listener(event));
      }
      
      // Also check wildcard listeners
      const eventNameParts = event.type.split('.');
      
      // Handle root wildcard '*' pattern
      const rootWildcardListeners = listeners.get('*');
      if (rootWildcardListeners) {
        rootWildcardListeners.forEach(listener => listener(event));
      }
      
      // Handle nested namespace wildcards (e.g., 'map.*', 'auth.*')
      for (let i = 1; i < eventNameParts.length; i++) {
        const wildcardPattern = eventNameParts.slice(0, i).join('.') + '.*';
        const wildcardListeners = listeners.get(wildcardPattern);
        if (wildcardListeners) {
          wildcardListeners.forEach(listener => listener(event));
        }
      }
    }),
    
    on: vi.fn((eventType: string, listener: EventListener) => {
      if (!listeners.has(eventType)) {
        listeners.set(eventType, new Set());
      }
      listeners.get(eventType)!.add(listener);
      
      // Return unsubscribe function
      return () => {
        const eventListeners = listeners.get(eventType);
        if (eventListeners) {
          eventListeners.delete(listener);
          if (eventListeners.size === 0) {
            listeners.delete(eventType);
          }
        }
      };
    }),
    
    getListenerCount: vi.fn((eventType: string) => {
      const eventListeners = listeners.get(eventType);
      return eventListeners ? eventListeners.size : 0;
    }),
    
    // Expose internals for testing
    emittedEvents
  };

  return mockEventBus as MockEventBus;
}

/**
 * Helper to assert that a specific event was emitted
 * 
 * @example
 * expect(eventBus).toHaveEmittedEvent('map.tile_created');
 * expect(eventBus).toHaveEmittedEvent('map.tile_created', { tileId: '123' });
 */
export function expectEventEmitted(
  eventBus: MockEventBus,
  eventType: string,
  payload?: unknown
): void {
  const emittedEvent = eventBus.emittedEvents.find(e => e.type === eventType);
  
  if (!emittedEvent) {
    throw new Error(`Expected event "${eventType}" to be emitted, but it was not. Emitted events: ${eventBus.emittedEvents.map(e => e.type).join(', ')}`);
  }
  
  if (payload !== undefined) {
    expect(emittedEvent.payload).toEqual(payload);
  }
}

/**
 * Helper to assert that a specific event was NOT emitted
 */
export function expectEventNotEmitted(
  eventBus: MockEventBus,
  eventType: string
): void {
  const emittedEvent = eventBus.emittedEvents.find(e => e.type === eventType);
  
  if (emittedEvent) {
    throw new Error(`Expected event "${eventType}" NOT to be emitted, but it was.`);
  }
}

/**
 * Clear all emitted events (useful for resetting between test cases)
 */
export function clearEmittedEvents(eventBus: MockEventBus): void {
  eventBus.emittedEvents.length = 0;
  eventBus.emit.mockClear();
}

/**
 * Custom Vitest matcher for event emission
 * 
 * Usage in tests:
 * expect(eventBus).toHaveEmittedEvent('map.tile_created');
 * expect(eventBus).toHaveEmittedEvent('map.tile_created', { tileId: '123' });
 */
export const eventBusMatchers = {
  toHaveEmittedEvent(
    received: MockEventBus,
    eventType: string,
    payload?: unknown
  ) {
    const emittedEvent = received.emittedEvents.find(e => e.type === eventType);
    
    if (!emittedEvent) {
      return {
        pass: false,
        message: () => `Expected event "${eventType}" to be emitted. Emitted events: ${received.emittedEvents.map(e => e.type).join(', ')}`
      };
    }
    
    if (payload !== undefined) {
      const isEqual = JSON.stringify(emittedEvent.payload) === JSON.stringify(payload);
      if (!isEqual) {
        return {
          pass: false,
          message: () => `Expected event "${eventType}" to be emitted with payload ${JSON.stringify(payload)}, but got ${JSON.stringify(emittedEvent.payload)}`
        };
      }
    }
    
    return {
      pass: true,
      message: () => `Expected event "${eventType}" not to be emitted`
    };
  }
};