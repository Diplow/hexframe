import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { globalTilePositionService } from '~/app/map/Services/TilePosition/GlobalTilePositionService';

describe('GlobalTilePositionService', () => {
  let canvasElement: HTMLDivElement;

  beforeEach(() => {
    // Create mock canvas element
    canvasElement = document.createElement('div');
    canvasElement.style.position = 'relative';
    canvasElement.style.width = '1000px';
    canvasElement.style.height = '800px';
    document.body.appendChild(canvasElement);

    // Mock getBoundingClientRect for canvas (centered at viewport)
    canvasElement.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      width: 1000,
      height: 800,
      right: 1100,
      bottom: 900,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });

    globalTilePositionService.setCanvasElement(canvasElement);
  });

  afterEach(() => {
    document.body.removeChild(canvasElement);
    globalTilePositionService._reset();
  });

  describe('getTilePosition', () => {
    it('should return null if canvas not set', () => {
      globalTilePositionService.setCanvasElement(null);
      const position = globalTilePositionService.getTilePosition('1,0:1');
      expect(position).toBeNull();
    });

    it('should return null if tile not found', () => {
      const position = globalTilePositionService.getTilePosition('nonexistent');
      expect(position).toBeNull();
    });

    it('should return canvas-relative position for center tile', () => {
      // Create tile at canvas center
      const tile = document.createElement('div');
      tile.setAttribute('data-tile-id', '1,0:');
      canvasElement.appendChild(tile);

      // Mock tile at exact canvas center
      tile.getBoundingClientRect = () => ({
        left: 550,  // Canvas center X (100 + 1000/2 - 50)
        top: 450,   // Canvas center Y (100 + 800/2 - 50)
        width: 100,
        height: 100,
        right: 650,
        bottom: 550,
        x: 550,
        y: 450,
        toJSON: () => ({}),
      });

      const position = globalTilePositionService.getTilePosition('1,0:');
      expect(position).toEqual({ x: 0, y: 0 });
    });

    it('should return positive offset for tile right of center', () => {
      const tile = document.createElement('div');
      tile.setAttribute('data-tile-id', '1,0:3'); // East tile
      canvasElement.appendChild(tile);

      // Mock tile 200px right of center
      tile.getBoundingClientRect = () => ({
        left: 750,
        top: 450,
        width: 100,
        height: 100,
        right: 850,
        bottom: 550,
        x: 750,
        y: 450,
        toJSON: () => ({}),
      });

      const position = globalTilePositionService.getTilePosition('1,0:3');
      expect(position).toEqual({ x: 200, y: 0 });
    });

    it('should return negative offset for tile left of center', () => {
      const tile = document.createElement('div');
      tile.setAttribute('data-tile-id', '1,0:6'); // West tile
      canvasElement.appendChild(tile);

      // Mock tile 200px left of center
      tile.getBoundingClientRect = () => ({
        left: 350,
        top: 450,
        width: 100,
        height: 100,
        right: 450,
        bottom: 550,
        x: 350,
        y: 450,
        toJSON: () => ({}),
      });

      const position = globalTilePositionService.getTilePosition('1,0:6');
      expect(position).toEqual({ x: -200, y: 0 });
    });

    it('should handle tiles with different sizes', () => {
      const tile = document.createElement('div');
      tile.setAttribute('data-tile-id', '1,0:1,1');
      canvasElement.appendChild(tile);

      // Mock smaller tile (scale-2)
      tile.getBoundingClientRect = () => ({
        left: 600,
        top: 400,
        width: 50,
        height: 50,
        right: 650,
        bottom: 450,
        x: 600,
        y: 400,
        toJSON: () => ({}),
      });

      const position = globalTilePositionService.getTilePosition('1,0:1,1');
      // Tile center: (625, 425), Canvas center: (600, 500)
      expect(position).toEqual({ x: 25, y: -75 });
    });
  });

  describe('hasTile', () => {
    it('should return false if canvas not set', () => {
      globalTilePositionService.setCanvasElement(null);
      expect(globalTilePositionService.hasTile('1,0:1')).toBe(false);
    });

    it('should return false if tile not found', () => {
      expect(globalTilePositionService.hasTile('nonexistent')).toBe(false);
    });

    it('should return true if tile exists', () => {
      const tile = document.createElement('div');
      tile.setAttribute('data-tile-id', '1,0:1');
      canvasElement.appendChild(tile);

      expect(globalTilePositionService.hasTile('1,0:1')).toBe(true);
    });
  });

  describe('getAllVisibleTileIds', () => {
    it('should return empty array if canvas not set', () => {
      globalTilePositionService.setCanvasElement(null);
      expect(globalTilePositionService.getAllVisibleTileIds()).toEqual([]);
    });

    it('should return all tile IDs', () => {
      const tile1 = document.createElement('div');
      tile1.setAttribute('data-tile-id', '1,0:1');
      const tile2 = document.createElement('div');
      tile2.setAttribute('data-tile-id', '1,0:2');
      const tile3 = document.createElement('div');
      tile3.setAttribute('data-tile-id', '1,0:3');

      canvasElement.appendChild(tile1);
      canvasElement.appendChild(tile2);
      canvasElement.appendChild(tile3);

      const ids = globalTilePositionService.getAllVisibleTileIds();
      expect(ids).toEqual(['1,0:1', '1,0:2', '1,0:3']);
    });

    it('should ignore elements without data-tile-id', () => {
      const tile = document.createElement('div');
      tile.setAttribute('data-tile-id', '1,0:1');
      const other = document.createElement('div');

      canvasElement.appendChild(tile);
      canvasElement.appendChild(other);

      const ids = globalTilePositionService.getAllVisibleTileIds();
      expect(ids).toEqual(['1,0:1']);
    });
  });

  describe('setCanvasElement', () => {
    it('should update canvas reference', () => {
      const newCanvas = document.createElement('div');
      globalTilePositionService.setCanvasElement(newCanvas);

      // Should now query the new canvas
      expect(globalTilePositionService.getAllVisibleTileIds()).toEqual([]);
    });

    it('should allow setting null', () => {
      globalTilePositionService.setCanvasElement(null);
      expect(globalTilePositionService.getTilePosition('1,0:1')).toBeNull();
    });
  });
});
