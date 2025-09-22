import type { TileData } from "~/app/map/types";
import type { DragEvent } from "react";
import type { EventBusService } from "~/app/map";

export interface TileGeometry {
  coordId: string;
  bounds: DOMRect;
  element: HTMLElement;
  isValidDropTarget: boolean;
}

export interface DragState {
  isDragging: boolean;
  draggedTileId: string | null;
  draggedTileData: TileData | null;
  currentHoveredTile: string | null;
  dropOperation: 'move' | 'swap' | null;
  dragOffset: { x: number; y: number };
}

export type DragAndDropEvent =
  | { type: 'drag.started'; source: 'drag_service'; payload: { tileId: string; tileData: TileData; offset: { x: number; y: number } }; timestamp: Date }
  | { type: 'drag.hovering'; source: 'drag_service'; payload: { targetId: string; operation: 'move' | 'swap'; isValid: boolean }; timestamp: Date }
  | { type: 'drag.leave'; source: 'drag_service'; payload: { previousTargetId: string }; timestamp: Date }
  | { type: 'drag.dropped'; source: 'drag_service'; payload: { sourceId: string; targetId: string; operation: 'move' | 'swap' }; timestamp: Date }
  | { type: 'drag.ended'; source: 'drag_service'; payload: null; timestamp: Date };

/**
 * DOM-based drag and drop service that detects drop targets through geometric intersection
 * rather than relying on React event propagation and tile coupling
 */
export class DOMBasedDragService {
  private state: DragState = {
    isDragging: false,
    draggedTileId: null,
    draggedTileData: null,
    currentHoveredTile: null,
    dropOperation: null,
    dragOffset: { x: 0, y: 0 },
  };

  private tileRegistry = new Map<string, TileGeometry>();
  private validateDropTarget: ((sourceId: string, targetId: string) => boolean) | null = null;
  private determineOperation: ((targetId: string) => 'move' | 'swap') | null = null;
  private eventBus: EventBusService;
  private mouseTracker: { x: number; y: number } = { x: 0, y: 0 };

  constructor(eventBus: EventBusService) {
    this.eventBus = eventBus;
    this._setupGlobalMouseTracking();
  }

  /**
   * Configure validation and operation determination callbacks
   */
  configure(options: {
    validateDropTarget: (sourceId: string, targetId: string) => boolean;
    determineOperation: (targetId: string) => 'move' | 'swap';
  }) {
    this.validateDropTarget = options.validateDropTarget;
    this.determineOperation = options.determineOperation;
  }

  /**
   * Register a tile's geometric information for drop target detection
   */
  registerTile(coordId: string, element: HTMLElement, isValidDropTarget = true) {
    const bounds = element.getBoundingClientRect();
    const geometry: TileGeometry = {
      coordId,
      bounds,
      element,
      isValidDropTarget
    };

    this.tileRegistry.set(coordId, geometry);
  }

  /**
   * Unregister a tile when it's unmounted
   */
  unregisterTile(coordId: string) {
    this.tileRegistry.delete(coordId);
  }

  /**
   * Update tile bounds (call when tiles resize or move)
   */
  updateTileBounds(coordId: string) {
    const geometry = this.tileRegistry.get(coordId);
    if (geometry) {
      geometry.bounds = geometry.element.getBoundingClientRect();
      console.log('📐 Updated tile bounds', {
        coordId,
        bounds: { x: geometry.bounds.x, y: geometry.bounds.y, width: geometry.bounds.width, height: geometry.bounds.height }
      });
    }
  }

  /**
   * Start a drag operation
   */
  startDrag(tileId: string, tileData: TileData, event: DragEvent<HTMLDivElement>) {
    console.log('🎯 startDrag called', {
      tileId,
      tileName: tileData.data.name,
      mousePosition: { x: this.mouseTracker.x, y: this.mouseTracker.y }
    });

    const offset = {
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    };

    this.state = {
      isDragging: true,
      draggedTileId: tileId,
      draggedTileData: tileData,
      currentHoveredTile: null,
      dropOperation: null,
      dragOffset: offset,
    };

    // Setup drag effect
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", tileId);

    this.eventBus.emit({
      type: 'drag.started',
      source: 'drag_service',
      payload: { tileId, tileData, offset },
      timestamp: new Date(),
    });

    // Start continuous hover detection
    this._startHoverDetection();
  }

  /**
   * Handle drop operation
   */
  executeDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (!this.state.isDragging || !this.state.draggedTileId) {
      return null;
    }

    // Use the current hover target if available, otherwise detect at current position
    let targetId = this.state.currentHoveredTile;

    if (!targetId) {
      // Fallback: detect target at current mouse position
      targetId = this._detectTileAtPosition(this.mouseTracker.x, this.mouseTracker.y);
    }

    if (!targetId) {
      this.endDrag();
      return null;
    }

    const sourceId = this.state.draggedTileId;
    const operation = this.determineOperation?.(targetId) ?? 'move';

    // Validate one more time
    const isValid = this.validateDropTarget?.(sourceId, targetId) ?? false;
    if (!isValid) {
      this.endDrag();
      return null;
    }

    this.eventBus.emit({
      type: 'drag.dropped',
      source: 'drag_service',
      payload: { sourceId, targetId, operation },
      timestamp: new Date(),
    });

    const result = { sourceId, targetId, operation };
    this.endDrag();
    return result;
  }

  /**
   * End the drag operation
   */
  endDrag() {
    this._stopHoverDetection();

    this.state = {
      isDragging: false,
      draggedTileId: null,
      draggedTileData: null,
      currentHoveredTile: null,
      dropOperation: null,
      dragOffset: { x: 0, y: 0 },
    };

    this.eventBus.emit({
      type: 'drag.ended',
      source: 'drag_service',
      payload: null,
      timestamp: new Date()
    });
  }

  /**
   * Get current drag state
   */
  getState(): Readonly<DragState> {
    return { ...this.state };
  }

  /**
   * Check if currently dragging a specific tile
   */
  isDraggingTile(tileId: string): boolean {
    return this.state.isDragging && this.state.draggedTileId === tileId;
  }

  /**
   * Check if a tile is the current hover target
   */
  isHoverTarget(tileId: string): boolean {
    return this.state.currentHoveredTile === tileId;
  }

  /**
   * Get drop operation for a specific tile
   */
  getDropOperation(tileId: string): 'move' | 'swap' | null {
    if (this.state.currentHoveredTile === tileId) {
      return this.state.dropOperation;
    }
    return null;
  }

  // Private implementation methods

  private _setupGlobalMouseTracking() {
    const updateMousePosition = (e: MouseEvent) => {
      this.mouseTracker.x = e.clientX;
      this.mouseTracker.y = e.clientY;
    };

    const updateMousePositionFromDrag = (e: Event) => {
      // During HTML5 drag, mousemove events are suppressed
      // Use dragover events to track mouse position instead
      const dragEvent = e as globalThis.DragEvent;
      this.mouseTracker.x = dragEvent.clientX;
      this.mouseTracker.y = dragEvent.clientY;
    };

    document.addEventListener('mousemove', updateMousePosition);
    document.addEventListener('dragover', updateMousePositionFromDrag);

    // Store the cleanup function for potential future use
    return () => {
      document.removeEventListener('mousemove', updateMousePosition);
      document.removeEventListener('dragover', updateMousePositionFromDrag);
    };
  }

  private hoverDetectionInterval: number | null = null;

  private _startHoverDetection() {
    // Check for hover targets every 16ms (~60fps)
    this.hoverDetectionInterval = window.setInterval(() => {
      this._checkHoverTarget();
    }, 16);
  }

  private _stopHoverDetection() {
    if (this.hoverDetectionInterval) {
      clearInterval(this.hoverDetectionInterval);
      this.hoverDetectionInterval = null;
    }
  }

  private _checkHoverTarget() {
    if (!this.state.isDragging) {
      return;
    }

    // Update all tile bounds before detection to ensure they're current
    this._updateAllTileBounds();

    const currentTarget = this._detectTileAtPosition(this.mouseTracker.x, this.mouseTracker.y);

    // No change in hover target
    if (currentTarget === this.state.currentHoveredTile) {
      return;
    }

    // Handle leaving previous target
    if (this.state.currentHoveredTile && this.state.currentHoveredTile !== currentTarget) {
      this.eventBus.emit({
        type: 'drag.leave',
        source: 'drag_service',
        payload: { previousTargetId: this.state.currentHoveredTile },
        timestamp: new Date(),
      });
    }

    // Update state
    this.state = {
      ...this.state,
      currentHoveredTile: currentTarget,
      dropOperation: currentTarget ? (this.determineOperation?.(currentTarget) ?? 'move') : null,
    };

    // Handle entering new target
    if (currentTarget) {
      const isValid = this.validateDropTarget?.(this.state.draggedTileId!, currentTarget) ?? false;
      const operation = this.state.dropOperation!;

      this.eventBus.emit({
        type: 'drag.hovering',
        source: 'drag_service',
        payload: { targetId: currentTarget, operation, isValid },
        timestamp: new Date(),
      });
    }
  }

  private _updateAllTileBounds() {
    for (const geometry of this.tileRegistry.values()) {
      geometry.bounds = geometry.element.getBoundingClientRect();
    }
  }

  private _detectTileAtPosition(x: number, y: number): string | null {
    // Find the topmost tile at the given position
    // Check in reverse order (topmost first, assuming later registrations are on top)
    const tiles = Array.from(this.tileRegistry.values()).reverse();

    for (const tile of tiles) {
      const inBounds = this._isPointInBounds(x, y, tile.bounds);

      if (inBounds && tile.isValidDropTarget) {
        // Skip the dragged tile itself
        if (this.state.draggedTileId === tile.coordId) {
          continue;
        }

        // Additional validation through the validation callback
        if (this.state.draggedTileId && this.validateDropTarget) {
          const isValid = this.validateDropTarget(this.state.draggedTileId, tile.coordId);
          if (isValid) {
            return tile.coordId;
          }
        } else {
          return tile.coordId;
        }
      }
    }

    return null;
  }

  private _isPointInBounds(x: number, y: number, bounds: DOMRect): boolean {
    return x >= bounds.left &&
           x <= bounds.right &&
           y >= bounds.top &&
           y <= bounds.bottom;
  }
}

// Factory function to create service with event bus
export function createDOMBasedDragService(eventBus: EventBusService): DOMBasedDragService {
  return new DOMBasedDragService(eventBus);
}