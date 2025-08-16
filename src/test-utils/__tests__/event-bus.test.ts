import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockEventBus, expectEventEmitted, expectEventNotEmitted, clearEmittedEvents } from '../event-bus';
import type { AppEvent } from '~/app/map/interface';

describe('EventBus Test Utilities', () => {
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
  });

  describe('createMockEventBus', () => {
    it('should track emitted events', () => {
      const event: AppEvent = {
        type: 'test.event',
        source: 'test',
        payload: { data: 'test' }
      };

      mockEventBus.emit(event);

      expect(mockEventBus.emit).toHaveBeenCalledWith(event);
      expect(mockEventBus.emittedEvents).toHaveLength(1);
      expect(mockEventBus.emittedEvents[0]).toEqual(event);
    });

    it('should simulate listener calls when events are emitted', () => {
      const listener = vi.fn();
      const event: AppEvent = {
        type: 'test.event',
        source: 'test',
        payload: { data: 'test' }
      };

      mockEventBus.on('test.event', listener);
      mockEventBus.emit(event);

      expect(listener).toHaveBeenCalledWith(event);
    });

    it('should handle wildcard listeners', () => {
      const wildcardListener = vi.fn();
      const specificListener = vi.fn();
      const event: AppEvent = {
        type: 'map.tile_created',
        source: 'map_cache',
        payload: { tileId: '123' }
      };

      mockEventBus.on('map.*', wildcardListener);
      mockEventBus.on('map.tile_created', specificListener);
      mockEventBus.emit(event);

      expect(wildcardListener).toHaveBeenCalledWith(event);
      expect(specificListener).toHaveBeenCalledWith(event);
    });

    it('should handle unsubscribe', () => {
      const listener = vi.fn();
      const event: AppEvent = {
        type: 'test.event',
        source: 'test',
        payload: { data: 'test' }
      };

      const unsubscribe = mockEventBus.on('test.event', listener) as () => void;
      unsubscribe();
      mockEventBus.emit(event);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('expectEventEmitted', () => {
    it('should pass when event was emitted', () => {
      const event: AppEvent = {
        type: 'test.event',
        source: 'test',
        payload: { data: 'test' }
      };

      mockEventBus.emit(event);

      expect(() => expectEventEmitted(mockEventBus, 'test.event')).not.toThrow();
    });

    it('should pass when event was emitted with correct payload', () => {
      const event: AppEvent = {
        type: 'test.event',
        source: 'test',
        payload: { data: 'test' }
      };

      mockEventBus.emit(event);

      expect(() => expectEventEmitted(mockEventBus, 'test.event', { data: 'test' })).not.toThrow();
    });

    it('should throw when event was not emitted', () => {
      expect(() => expectEventEmitted(mockEventBus, 'test.event')).toThrow(
        'Expected event "test.event" to be emitted, but it was not'
      );
    });
  });

  describe('expectEventNotEmitted', () => {
    it('should pass when event was not emitted', () => {
      expect(() => expectEventNotEmitted(mockEventBus, 'test.event')).not.toThrow();
    });

    it('should throw when event was emitted', () => {
      const event: AppEvent = {
        type: 'test.event',
        source: 'test',
        payload: { data: 'test' }
      };

      mockEventBus.emit(event);

      expect(() => expectEventNotEmitted(mockEventBus, 'test.event')).toThrow(
        'Expected event "test.event" NOT to be emitted, but it was'
      );
    });
  });

  describe('clearEmittedEvents', () => {
    it('should clear all emitted events', () => {
      const event: AppEvent = {
        type: 'test.event',
        source: 'test',
        payload: { data: 'test' }
      };

      mockEventBus.emit(event);
      expect(mockEventBus.emittedEvents).toHaveLength(1);

      clearEmittedEvents(mockEventBus);

      expect(mockEventBus.emittedEvents).toHaveLength(0);
      expect(mockEventBus.emit).toHaveBeenCalledTimes(0); // mock is cleared
    });
  });
});