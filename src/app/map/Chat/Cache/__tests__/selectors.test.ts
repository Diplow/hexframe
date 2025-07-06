import { describe, it, expect } from 'vitest';
import type { ChatEvent } from '../types';
import { deriveVisibleMessages, deriveActiveWidgets } from '../_selectors';

describe('Chat Selectors', () => {
  describe('deriveVisibleMessages', () => {
    it('should convert user_message events to messages', () => {
      const events: ChatEvent[] = [
        {
          id: '1',
          type: 'user_message',
          payload: { text: 'Hello world' },
          timestamp: new Date('2025-01-04T12:00:00Z'),
          actor: 'user',
        },
      ];

      const messages = deriveVisibleMessages(events);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        id: '1',
        type: 'user',
        content: 'Hello world',
        timestamp: new Date('2025-01-04T12:00:00Z'),
      });
    });

    it('should convert system_message events to messages', () => {
      const events: ChatEvent[] = [
        {
          id: '1',
          type: 'system_message',
          payload: { text: 'Welcome to Hexframe' },
          timestamp: new Date('2025-01-04T12:00:00Z'),
          actor: 'system',
        },
      ];

      const messages = deriveVisibleMessages(events);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        id: '1',
        type: 'system',
        content: 'Welcome to Hexframe',
        timestamp: new Date('2025-01-04T12:00:00Z'),
      });
    });

    it('should include operation_completed events as messages', () => {
      const events: ChatEvent[] = [
        {
          id: '1',
          type: 'operation_completed',
          payload: {
            operation: 'delete',
            message: 'Successfully deleted "My Tile"',
          },
          timestamp: new Date('2025-01-04T12:00:00Z'),
          actor: 'system',
        },
      ];

      const messages = deriveVisibleMessages(events);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        id: '1',
        type: 'system',
        content: 'Successfully deleted "My Tile"',
        timestamp: new Date('2025-01-04T12:00:00Z'),
      });
    });

    it('should filter out non-message events', () => {
      const events: ChatEvent[] = [
        {
          id: '1',
          type: 'user_message',
          payload: { text: 'Hello' },
          timestamp: new Date(),
          actor: 'user',
        },
        {
          id: '2',
          type: 'tile_selected',
          payload: { tileId: '123' },
          timestamp: new Date(),
          actor: 'system',
        },
        {
          id: '3',
          type: 'operation_started',
          payload: { operation: 'delete' },
          timestamp: new Date(),
          actor: 'system',
        },
      ];

      const messages = deriveVisibleMessages(events);

      expect(messages).toHaveLength(1);
      expect(messages[0]?.id).toBe('1');
    });

    it('should preserve chronological order', () => {
      const events: ChatEvent[] = [
        {
          id: '1',
          type: 'system_message',
          payload: { text: 'First' },
          timestamp: new Date('2025-01-04T10:00:00Z'),
          actor: 'system',
        },
        {
          id: '2',
          type: 'user_message',
          payload: { text: 'Second' },
          timestamp: new Date('2025-01-04T11:00:00Z'),
          actor: 'user',
        },
        {
          id: '3',
          type: 'operation_completed',
          payload: { message: 'Third' },
          timestamp: new Date('2025-01-04T12:00:00Z'),
          actor: 'system',
        },
      ];

      const messages = deriveVisibleMessages(events);

      expect(messages).toHaveLength(3);
      expect(messages[0]?.content).toBe('First');
      expect(messages[1]?.content).toBe('Second');
      expect(messages[2]?.content).toBe('Third');
    });
  });

  describe('deriveActiveWidgets', () => {
    it('should create preview widget from tile_selected event', () => {
      const events: ChatEvent[] = [
        {
          id: '1',
          type: 'tile_selected',
          payload: {
            tileId: 'tile-123',
            tileData: {
              id: 'tile-123',
              name: 'My Tile',
              content: 'Tile content',
              // other tile properties
            },
          },
          timestamp: new Date('2025-01-04T12:00:00Z'),
          actor: 'user',
        },
      ];

      const widgets = deriveActiveWidgets(events);

      expect(widgets).toHaveLength(1);
      expect(widgets[0]).toEqual({
        id: 'widget-1',
        type: 'preview',
        tileData: {
          id: 'tile-123',
          name: 'My Tile',
          content: 'Tile content',
        },
        timestamp: new Date('2025-01-04T12:00:00Z'),
      });
    });

    it('should show loading widget for operation_started', () => {
      const events: ChatEvent[] = [
        {
          id: '1',
          type: 'operation_started',
          payload: {
            operation: 'delete',
            tileId: 'tile-123',
            tileName: 'My Tile',
          },
          timestamp: new Date('2025-01-04T12:00:00Z'),
          actor: 'user',
        },
      ];

      const widgets = deriveActiveWidgets(events);

      expect(widgets).toHaveLength(1);
      expect(widgets[0]).toEqual({
        id: 'widget-1',
        type: 'loading',
        operation: 'delete',
        message: 'Deleting "My Tile"...',
        timestamp: new Date('2025-01-04T12:00:00Z'),
      });
    });

    it('should remove widget after operation_completed', () => {
      const events: ChatEvent[] = [
        {
          id: '1',
          type: 'operation_started',
          payload: {
            operation: 'delete',
            tileId: 'tile-123',
            tileName: 'My Tile',
          },
          timestamp: new Date('2025-01-04T12:00:00Z'),
          actor: 'user',
        },
        {
          id: '2',
          type: 'operation_completed',
          payload: {
            operation: 'delete',
            tileId: 'tile-123',
            success: true,
          },
          timestamp: new Date('2025-01-04T12:01:00Z'),
          actor: 'system',
        },
      ];

      const widgets = deriveActiveWidgets(events);

      expect(widgets).toHaveLength(0);
    });

    it('should show error widget for error_occurred', () => {
      const events: ChatEvent[] = [
        {
          id: '1',
          type: 'error_occurred',
          payload: {
            error: 'Failed to delete tile',
            operation: 'delete',
            tileId: 'tile-123',
          },
          timestamp: new Date('2025-01-04T12:00:00Z'),
          actor: 'system',
        },
      ];

      const widgets = deriveActiveWidgets(events);

      expect(widgets).toHaveLength(1);
      expect(widgets[0]).toEqual({
        id: 'widget-1',
        type: 'error',
        message: 'Failed to delete tile',
        retryAction: {
          operation: 'delete',
          tileId: 'tile-123',
        },
        timestamp: new Date('2025-01-04T12:00:00Z'),
      });
    });

    it('should show login widget for auth_required', () => {
      const events: ChatEvent[] = [
        {
          id: '1',
          type: 'auth_required',
          payload: {
            message: 'Please log in to continue',
            nextAction: { type: 'create_tile' },
          },
          timestamp: new Date('2025-01-04T12:00:00Z'),
          actor: 'system',
        },
      ];

      const widgets = deriveActiveWidgets(events);

      expect(widgets).toHaveLength(1);
      expect(widgets[0]).toEqual({
        id: 'widget-1',
        type: 'login',
        message: 'Please log in to continue',
        nextAction: { type: 'create_tile' },
        timestamp: new Date('2025-01-04T12:00:00Z'),
      });
    });

    it('should handle multiple widgets correctly', () => {
      const events: ChatEvent[] = [
        {
          id: '1',
          type: 'tile_selected',
          payload: { tileId: 'tile-1', tileData: { id: 'tile-1', name: 'Tile 1' } },
          timestamp: new Date('2025-01-04T10:00:00Z'),
          actor: 'user',
        },
        {
          id: '2',
          type: 'auth_required',
          payload: { message: 'Login needed' },
          timestamp: new Date('2025-01-04T11:00:00Z'),
          actor: 'system',
        },
      ];

      const widgets = deriveActiveWidgets(events);

      expect(widgets).toHaveLength(2);
      expect(widgets[0]?.type).toBe('preview');
      expect(widgets[1]?.type).toBe('login');
    });

    it('should handle widget lifecycle with navigation events', () => {
      const events: ChatEvent[] = [
        {
          id: '1',
          type: 'tile_selected',
          payload: { tileId: 'tile-1', tileData: { id: 'tile-1' } },
          timestamp: new Date('2025-01-04T10:00:00Z'),
          actor: 'user',
        },
        {
          id: '2',
          type: 'navigation',
          payload: { fromTileId: 'tile-1', toTileId: 'tile-2' },
          timestamp: new Date('2025-01-04T10:01:00Z'),
          actor: 'system',
        },
      ];

      const widgets = deriveActiveWidgets(events);

      // Navigation should close the previous tile's preview widget
      expect(widgets).toHaveLength(0);
    });
  });
});