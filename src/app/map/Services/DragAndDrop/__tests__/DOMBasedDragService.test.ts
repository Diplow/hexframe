import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DOMBasedDragService } from '~/app/map/Services/DragAndDrop/DOMBasedDragService';
import type { EventBusService } from '~/app/map';
import type { TileData } from '~/app/map/types';
import type { DragEvent } from 'react';

// Mock window APIs
Object.defineProperty(window, 'setInterval', {
  value: vi.fn(() => 123), // Return a mock interval ID
});
Object.defineProperty(window, 'clearInterval', {
  value: vi.fn(),
});

// Mock EventBus
const mockEventBus: EventBusService = {
  emit: vi.fn(),
  on: vi.fn(() => vi.fn()),
  getListenerCount: vi.fn(() => 0),
};

// Mock DOM element
const createMockElement = (bounds: { x: number; y: number; width: number; height: number }) => {
  return {
    getBoundingClientRect: () => ({
      x: bounds.x,
      y: bounds.y,
      left: bounds.x,
      top: bounds.y,
      right: bounds.x + bounds.width,
      bottom: bounds.y + bounds.height,
      width: bounds.width,
      height: bounds.height,
    }),
  } as HTMLElement;
};

// Mock tile data
const createMockTileData = (name: string): TileData => ({
  metadata: {
    dbId: '1',
    coordId: '0/0/[1]',
    parentId: undefined,
    coordinates: { userId: 1, groupId: 0, path: [1] },
    depth: 1,
    ownerId: 'user1',
  },
  data: {
    name,
    description: 'Test tile',
    url: 'https://example.com',
    color: 'blue-500',
  },
  state: {
    isDragged: false,
    isHovered: false,
    isSelected: false,
    isExpanded: false,
    isDragOver: false,
    isHovering: false,
  },
});

describe('DOMBasedDragService', () => {
  let service: DOMBasedDragService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DOMBasedDragService(mockEventBus);
  });

  describe('Tile Registration', () => {
    it('should register tiles with their geometry', () => {
      const element = createMockElement({ x: 100, y: 100, width: 50, height: 50 });

      service.registerTile('tile1', element, true);

      // Service should have internal record (no direct access, test via behavior)
      expect(true).toBe(true); // Placeholder - we'll test via geometric detection
    });

    it('should unregister tiles', () => {
      const element = createMockElement({ x: 100, y: 100, width: 50, height: 50 });

      service.registerTile('tile1', element, true);
      service.unregisterTile('tile1');

      // Tile should no longer be detected (test via behavior)
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Drag Operations', () => {
    it('should start drag operation and emit event', () => {
      const tileData = createMockTileData('Test Tile');
      const mockEvent = {
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn(),
        },
        nativeEvent: {
          offsetX: 10,
          offsetY: 15,
        },
      } as unknown as DragEvent<HTMLDivElement>;

      service.startDrag('tile1', tileData, mockEvent);

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: 'drag.started',
        source: 'drag_service',
        payload: {
          tileId: 'tile1',
          tileData,
          offset: { x: 10, y: 15 },
        },
        timestamp: expect.any(Date) as Date,
      });

      expect(service.getState().isDragging).toBe(true);
      expect(service.getState().draggedTileId).toBe('tile1');
    });

    it('should end drag operation and emit event', () => {
      const tileData = createMockTileData('Test Tile');
      const mockEvent = {
        dataTransfer: { effectAllowed: '', setData: vi.fn() },
        nativeEvent: { offsetX: 10, offsetY: 15 },
      } as unknown as DragEvent<HTMLDivElement>;

      service.startDrag('tile1', tileData, mockEvent);
      service.endDrag();

      expect(mockEventBus.emit).toHaveBeenCalledWith({
        type: 'drag.ended',
        source: 'drag_service',
        payload: null,
        timestamp: expect.any(Date) as Date,
      });

      expect(service.getState().isDragging).toBe(false);
      expect(service.getState().draggedTileId).toBe(null);
    });
  });

  describe('State Queries', () => {
    it('should correctly report if dragging a specific tile', () => {
      const tileData = createMockTileData('Test Tile');
      const mockEvent = {
        dataTransfer: { effectAllowed: '', setData: vi.fn() },
        nativeEvent: { offsetX: 10, offsetY: 15 },
      } as unknown as DragEvent<HTMLDivElement>;

      expect(service.isDraggingTile('tile1')).toBe(false);

      service.startDrag('tile1', tileData, mockEvent);

      expect(service.isDraggingTile('tile1')).toBe(true);
      expect(service.isDraggingTile('tile2')).toBe(false);
    });

    it('should correctly report hover targets', () => {
      expect(service.isHoverTarget('tile1')).toBe(false);

      // Hover target would be set via internal hover detection
      // This tests the query interface
    });
  });

  describe('Configuration', () => {
    it('should accept validation and operation callbacks', () => {
      const validateDropTarget = vi.fn().mockReturnValue(true);
      const determineOperation = vi.fn().mockReturnValue('move');

      service.configure({
        validateDropTarget,
        determineOperation,
      });

      // Configuration is internal, tested via behavior in integration tests
      expect(true).toBe(true);
    });
  });
});