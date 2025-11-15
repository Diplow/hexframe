/**
 * Global tile position service - provides canvas-relative positions for tiles
 * Uses DOM queries similar to GlobalDragService for consistency
 *
 * Architecture:
 * - Singleton pattern for global state
 * - DOM-based position lookup using data-tile-id attributes
 * - Canvas-relative coordinates calculated via getBoundingClientRect
 * - Works for any visible tile (center, neighbors, expanded children)
 */

export interface TilePosition {
  x: number;
  y: number;
}

class GlobalTilePositionService {
  private static instance: GlobalTilePositionService | null = null;
  private canvasElement: HTMLElement | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GlobalTilePositionService {
    GlobalTilePositionService.instance ??= new GlobalTilePositionService();
    return GlobalTilePositionService.instance;
  }

  /**
   * Set the canvas element reference
   * Should be called when canvas mounts/unmounts
   */
  setCanvasElement(element: HTMLElement | null): void {
    this.canvasElement = element;
  }

  /**
   * Get tile position relative to canvas center
   *
   * @param coordId - Tile coordinate ID (e.g., "1,0:1,2")
   * @returns Position relative to canvas center, or null if tile not found
   *
   * @example
   * const pos = service.getTilePosition('1,0:1');
   * // Returns { x: 100, y: 200 } (100px right, 200px down from center)
   */
  getTilePosition(coordId: string): TilePosition | null {
    if (!this.canvasElement) {
      return null;
    }

    // Find tile element using data-tile-id attribute (same as GlobalDragService)
    const tileElement = this.canvasElement.querySelector<HTMLElement>(
      `[data-tile-id="${coordId}"]`
    );

    if (!tileElement) {
      return null;
    }

    // Get bounding rectangles
    const canvasRect = this.canvasElement.getBoundingClientRect();
    const tileRect = tileElement.getBoundingClientRect();

    // Calculate tile center relative to canvas center
    const canvasCenterX = canvasRect.left + canvasRect.width / 2;
    const canvasCenterY = canvasRect.top + canvasRect.height / 2;
    const tileCenterX = tileRect.left + tileRect.width / 2;
    const tileCenterY = tileRect.top + tileRect.height / 2;

    const position = {
      x: tileCenterX - canvasCenterX,
      y: tileCenterY - canvasCenterY,
    };

    // DEBUG: Log the calculation
    console.log('[TilePositionService] Position calculation for', coordId);
    console.log('  Canvas rect:', { left: canvasRect.left, top: canvasRect.top, width: canvasRect.width, height: canvasRect.height });
    console.log('  Canvas center:', { x: canvasCenterX, y: canvasCenterY });
    console.log('  Tile rect:', { left: tileRect.left, top: tileRect.top, width: tileRect.width, height: tileRect.height });
    console.log('  Tile center:', { x: tileCenterX, y: tileCenterY });
    console.log('  Relative position:', position);

    return position;
  }

  /**
   * Check if a tile exists in the DOM
   *
   * @param coordId - Tile coordinate ID
   * @returns true if tile element found, false otherwise
   */
  hasTile(coordId: string): boolean {
    if (!this.canvasElement) {
      return false;
    }
    return this.canvasElement.querySelector(`[data-tile-id="${coordId}"]`) !== null;
  }

  /**
   * Get all visible tile IDs
   * Useful for debugging or batch operations
   */
  getAllVisibleTileIds(): string[] {
    if (!this.canvasElement) {
      return [];
    }

    const tileElements = this.canvasElement.querySelectorAll('[data-tile-id]');
    return Array.from(tileElements)
      .map(el => el.getAttribute('data-tile-id'))
      .filter((id): id is string => id !== null);
  }

  /**
   * Reset service state (for testing)
   * @internal
   */
  _reset(): void {
    this.canvasElement = null;
  }
}

// Export singleton instance
export const globalTilePositionService = GlobalTilePositionService.getInstance();
