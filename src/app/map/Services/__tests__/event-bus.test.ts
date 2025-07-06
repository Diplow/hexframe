import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../event-bus';
import type { AppEvent } from '../../types/events';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('emit and on', () => {
    it('should emit events to registered listeners', () => {
      const listener = vi.fn();
      const event: AppEvent = {
        type: 'test.event',
        source: 'test',
        payload: { data: 'test' }
      };

      eventBus.on('test.event', listener);
      eventBus.emit(event);

      expect(listener).toHaveBeenCalledWith(event);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should support multiple listeners for the same event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const event: AppEvent = {
        type: 'test.event',
        source: 'test',
        payload: { data: 'test' }
      };

      eventBus.on('test.event', listener1);
      eventBus.on('test.event', listener2);
      eventBus.emit(event);

      expect(listener1).toHaveBeenCalledWith(event);
      expect(listener2).toHaveBeenCalledWith(event);
    });

    it('should not call listeners for different event types', () => {
      const listener = vi.fn();
      const event: AppEvent = {
        type: 'other.event',
        source: 'test',
        payload: { data: 'test' }
      };

      eventBus.on('test.event', listener);
      eventBus.emit(event);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle events with no listeners gracefully', () => {
      const event: AppEvent = {
        type: 'unhandled.event',
        source: 'test',
        payload: { data: 'test' }
      };

      expect(() => eventBus.emit(event)).not.toThrow();
    });
  });

  describe('off (unsubscribe)', () => {
    it('should unsubscribe a listener', () => {
      const listener = vi.fn();
      const event: AppEvent = {
        type: 'test.event',
        source: 'test',
        payload: { data: 'test' }
      };

      const unsubscribe = eventBus.on('test.event', listener);
      unsubscribe();
      eventBus.emit(event);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should only unsubscribe the specific listener', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const event: AppEvent = {
        type: 'test.event',
        source: 'test',
        payload: { data: 'test' }
      };

      const unsubscribe1 = eventBus.on('test.event', listener1);
      eventBus.on('test.event', listener2);
      
      unsubscribe1();
      eventBus.emit(event);

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith(event);
    });

    it('should handle multiple unsubscribe calls gracefully', () => {
      const listener = vi.fn();
      const unsubscribe = eventBus.on('test.event', listener);

      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('namespace filtering', () => {
    it('should support wildcard listeners for namespaced events', () => {
      const wildcardListener = vi.fn();
      const mapEvent: AppEvent = {
        type: 'map.tile_created',
        source: 'map_cache',
        payload: { tileId: '123' }
      };

      eventBus.on('map.*', wildcardListener);
      eventBus.emit(mapEvent);

      expect(wildcardListener).toHaveBeenCalledWith(mapEvent);
    });

    it('should call both specific and wildcard listeners', () => {
      const specificListener = vi.fn();
      const wildcardListener = vi.fn();
      const event: AppEvent = {
        type: 'map.tile_created',
        source: 'map_cache',
        payload: { tileId: '123' }
      };

      eventBus.on('map.tile_created', specificListener);
      eventBus.on('map.*', wildcardListener);
      eventBus.emit(event);

      expect(specificListener).toHaveBeenCalledWith(event);
      expect(wildcardListener).toHaveBeenCalledWith(event);
    });

    it('should not match incorrect namespace wildcards', () => {
      const listener = vi.fn();
      const event: AppEvent = {
        type: 'chat.message_sent',
        source: 'chat_cache',
        payload: { message: 'hello' }
      };

      eventBus.on('map.*', listener);
      eventBus.emit(event);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple namespace levels', () => {
      const listener = vi.fn();
      const event: AppEvent = {
        type: 'map.tiles.swap.completed',
        source: 'map_cache',
        payload: { tile1: '123', tile2: '456' }
      };

      eventBus.on('map.tiles.*', listener);
      eventBus.emit(event);

      expect(listener).toHaveBeenCalledWith(event);
    });

    it('should support root wildcard listener that catches all events', () => {
      const rootListener = vi.fn();
      const specificListener = vi.fn();
      const events: AppEvent[] = [
        { type: 'map.navigation', source: 'map_cache', payload: {} },
        { type: 'chat.message_sent', source: 'chat_cache', payload: {} },
        { type: 'auth.login', source: 'auth', payload: {} }
      ];

      eventBus.on('*', rootListener);
      eventBus.on('map.navigation', specificListener);
      
      events.forEach(event => eventBus.emit(event));

      // Root listener should receive all events
      expect(rootListener).toHaveBeenCalledTimes(3);
      events.forEach(event => {
        expect(rootListener).toHaveBeenCalledWith(event);
      });

      // Specific listener should only receive the map.navigation event
      expect(specificListener).toHaveBeenCalledTimes(1);
      expect(specificListener).toHaveBeenCalledWith(events[0]);
    });
  });

  describe('memory leak prevention', () => {
    it('should remove event type entry when last listener is removed', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = eventBus.on('test.event', listener1);
      const unsubscribe2 = eventBus.on('test.event', listener2);

      unsubscribe1();
      unsubscribe2();

      // Emit event to verify no listeners are called
      eventBus.emit({ type: 'test.event', source: 'test', payload: {} });
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();

      // Check internal state (this would require exposing a method or property)
      expect(eventBus.getListenerCount('test.event')).toBe(0);
    });

    it('should handle large numbers of listeners without memory issues', () => {
      const listeners: Array<() => void> = [];
      const listenerCount = 1000;

      // Add many listeners
      for (let i = 0; i < listenerCount; i++) {
        const unsubscribe = eventBus.on('test.event', () => {
          // Empty listener for testing
        });
        listeners.push(unsubscribe);
      }

      expect(eventBus.getListenerCount('test.event')).toBe(listenerCount);

      // Remove all listeners
      listeners.forEach(unsubscribe => unsubscribe());

      expect(eventBus.getListenerCount('test.event')).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should continue calling other listeners if one throws', () => {
      const listener1 = vi.fn(() => {
        throw new Error('Listener error');
      });
      const listener2 = vi.fn();
      const event: AppEvent = {
        type: 'test.event',
        source: 'test',
        payload: { data: 'test' }
      };

      eventBus.on('test.event', listener1);
      eventBus.on('test.event', listener2);

      // Should not throw
      expect(() => eventBus.emit(event)).not.toThrow();

      // Both listeners should have been called
      expect(listener1).toHaveBeenCalledWith(event);
      expect(listener2).toHaveBeenCalledWith(event);
    });

    it('should handle listener errors in wildcard listeners', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Wildcard listener error');
      });
      const normalListener = vi.fn();
      const event: AppEvent = {
        type: 'map.tile_created',
        source: 'map_cache',
        payload: { tileId: '123' }
      };

      eventBus.on('map.*', errorListener);
      eventBus.on('map.tile_created', normalListener);

      expect(() => eventBus.emit(event)).not.toThrow();
      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('type safety', () => {
    it('should accept properly typed events', () => {
      const listener = vi.fn();
      const mapEvent: AppEvent = {
        type: 'map.tile_created',
        source: 'map_cache',
        payload: { tileId: '123', tileName: 'Test Tile' }
      };

      eventBus.on('map.tile_created', listener);
      eventBus.emit(mapEvent);

      expect(listener).toHaveBeenCalledWith(mapEvent);
    });

    it('should handle different event sources', () => {
      const listener = vi.fn();
      const events: AppEvent[] = [
        { type: 'test.event', source: 'map_cache', payload: {} },
        { type: 'test.event', source: 'chat_cache', payload: {} },
        { type: 'test.event', source: 'auth', payload: {} }
      ];

      eventBus.on('test.event', listener);
      events.forEach(event => eventBus.emit(event));

      expect(listener).toHaveBeenCalledTimes(3);
      events.forEach(event => {
        expect(listener).toHaveBeenCalledWith(event);
      });
    });
  });
});