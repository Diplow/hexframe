import type { AppEvent, EventListener, EventBusService } from '~/app/map/Services/types';
import { loggers } from '~/lib/debug/debug-logger';

/**
 * EventBus implementation for cross-system communication
 * 
 * Supports:
 * - Event emission and listening
 * - Namespace wildcards (e.g., 'map.*' matches all map events)
 * - Memory leak prevention
 * - Error isolation (one listener error doesn't affect others)
 */
export class EventBus implements EventBusService {
  private listeners = new Map<string, Set<EventListener>>();

  emit(event: AppEvent): void {
    // Debug logging is now handled by the logger itself based on its settings
    loggers.eventBus(`Emitting event: **${event.type}**`, {
      source: event.source,
      payload: event.payload
    });
    // Emit to specific event type listeners
    const specificListeners = this.listeners.get(event.type);
    if (specificListeners) {
      specificListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          // Swallow errors to prevent one listener from affecting others
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      });
    }

    // Emit to wildcard listeners
    const eventNameParts = event.type.split('.');
    
    // Handle root wildcard '*' pattern
    const rootWildcardListeners = this.listeners.get('*');
    if (rootWildcardListeners) {
      rootWildcardListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          // Swallow errors to prevent one listener from affecting others
          console.error(`Error in wildcard listener for *:`, error);
        }
      });
    }
    
    // Handle nested namespace wildcards (e.g., 'map.*', 'auth.*')
    for (let i = 1; i < eventNameParts.length; i++) {
      const wildcardPattern = eventNameParts.slice(0, i).join('.') + '.*';
      const wildcardListeners = this.listeners.get(wildcardPattern);
      if (wildcardListeners) {
        wildcardListeners.forEach(listener => {
          try {
            listener(event);
          } catch (error) {
            // Swallow errors to prevent one listener from affecting others
            console.error(`Error in wildcard listener for ${wildcardPattern}:`, error);
          }
        });
      }
    }
  }

  on<T extends AppEvent = AppEvent>(eventType: string, listener: EventListener<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    const eventListeners = this.listeners.get(eventType)!;
    eventListeners.add(listener as EventListener);

    // Return unsubscribe function
    return () => {
      eventListeners.delete(listener as EventListener);
      
      // Clean up empty sets to prevent memory leaks
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  getListenerCount(eventType: string): number {
    const eventListeners = this.listeners.get(eventType);
    return eventListeners ? eventListeners.size : 0;
  }
}
export const eventBus = new EventBus();
