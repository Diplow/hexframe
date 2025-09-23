/**
 * Global DOM-centric drag service that operates independently of React
 * Uses event delegation and CSS classes for visual feedback
 * No React state management - purely DOM-based
 */

export interface TileDropTarget {
  tileId: string;
  element: HTMLElement;
  isOwned: boolean;
}

export interface DragOperation {
  sourceId: string;
  targetId: string;
  operation: 'move' | 'swap';
}

export type DropHandler = (operation: DragOperation) => Promise<void>;
export type ValidationHandler = (sourceId: string, targetId: string, sourceOwned: boolean, targetOwned: boolean) => { isValid: boolean; reason?: string };

class GlobalDragService {
  private static instance: GlobalDragService | null = null;
  private isInitialized = false;
  private currentDraggedTile: string | null = null;
  private currentDropTarget: string | null = null;
  private dropHandler: DropHandler | null = null;
  private validationHandler: ValidationHandler | null = null;
  private currentUserId: number | null = null;
  private cleanupTimer: number | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): GlobalDragService {
    if (!GlobalDragService.instance) {
      GlobalDragService.instance = new GlobalDragService();
    }
    return GlobalDragService.instance;
  }

  /**
   * Initialize the service - should be called once when the app starts
   */
  initialize(options: {
    dropHandler: DropHandler;
    validationHandler: ValidationHandler;
    currentUserId: number;
  }) {
    console.log('🐛 GlobalDragService.initialize:', {
      currentUserId: options.currentUserId,
      wasInitialized: this.isInitialized
    });

    if (this.isInitialized) {
      // Update handlers if already initialized
      this.dropHandler = options.dropHandler;
      this.validationHandler = options.validationHandler;
      this.currentUserId = options.currentUserId;
      console.log('🐛 Updated handlers for already initialized service');
      return;
    }

    this.dropHandler = options.dropHandler;
    this.validationHandler = options.validationHandler;
    this.currentUserId = options.currentUserId;

    this.attachEventListeners();
    this.isInitialized = true;
    console.log('🐛 GlobalDragService initialized and event listeners attached');
  }

  /**
   * Start dragging a tile - called from tile's onDragStart
   */
  startDrag(tileId: string, event: DragEvent) {
    console.log('🐛 GlobalDragService.startDrag:', { tileId, isInitialized: this.isInitialized });

    if (!this.isInitialized) {
      console.warn('🐛 Drag service not initialized yet, preventing drag');
      event.preventDefault();
      return;
    }

    this.currentDraggedTile = tileId;

    // Set up drag data
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', tileId);

    // Add CSS class to indicate drag is active
    document.body.setAttribute('data-drag-active', 'true');

    // Start cleanup timer as a safety net (clear stale highlights every 100ms)
    this.startCleanupTimer();

    // Mark the dragged tile
    const draggedElement = this.findTileElement(tileId);
    if (draggedElement) {
      draggedElement.setAttribute('data-being-dragged', 'true');
      console.log('🐛 Marked dragged element:', draggedElement);
    } else {
      console.log('🐛 Could not find dragged element for:', tileId);
    }
  }

  /**
   * End drag operation
   */
  private endDrag() {
    console.log('🐛 GlobalDragService.endDrag: Cleaning up drag state');

    // Clean up CSS classes
    document.body.removeAttribute('data-drag-active');

    if (this.currentDraggedTile) {
      const draggedElement = this.findTileElement(this.currentDraggedTile);
      if (draggedElement) {
        draggedElement.removeAttribute('data-being-dragged');
        console.log('🐛 Cleaned up dragged element:', this.currentDraggedTile);
      }
    }

    // Clean up ALL drop targets to prevent stale highlights
    this.clearAllDropTargets();

    // Stop cleanup timer
    this.stopCleanupTimer();

    this.currentDraggedTile = null;
    this.currentDropTarget = null;
    console.log('🐛 Drag cleanup complete');
  }

  /**
   * Clear all drop target highlights - more aggressive cleanup
   */
  private clearAllDropTargets() {
    const allDropTargets = document.querySelectorAll('[data-drop-target="true"]');
    console.log('🐛 Clearing', allDropTargets.length, 'drop targets');

    allDropTargets.forEach((element) => {
      element.removeAttribute('data-drop-target');
      element.removeAttribute('data-drop-operation');
    });
  }

  private attachEventListeners() {
    // Use event delegation on document
    document.addEventListener('dragover', this.handleDragOver.bind(this));
    document.addEventListener('drop', this.handleDrop.bind(this));
    document.addEventListener('dragend', this.handleDragEnd.bind(this));
    document.addEventListener('dragleave', this.handleDragLeave.bind(this));
  }

  private handleDragOver(event: DragEvent) {
    event.preventDefault(); // Allow drop

    if (!this.currentDraggedTile) return;

    const dropTarget = this.findDropTargetFromEvent(event);
    console.log('🐛 DragOver:', {
      currentDraggedTile: this.currentDraggedTile,
      dropTarget: dropTarget?.tileId,
      currentDropTarget: this.currentDropTarget
    });

    // No change in target
    if (dropTarget?.tileId === this.currentDropTarget) {
      return;
    }

    // Clear previous target
    if (this.currentDropTarget) {
      const prevElement = this.findTileElement(this.currentDropTarget);
      if (prevElement) {
        prevElement.removeAttribute('data-drop-target');
        prevElement.removeAttribute('data-drop-operation');
      }
    }

    // Set new target
    if (dropTarget && dropTarget.tileId !== this.currentDraggedTile) {
      const validation = this.validateDrop(this.currentDraggedTile, dropTarget);
      console.log('🐛 Validation result:', validation);

      if (validation.isValid) {
        this.currentDropTarget = dropTarget.tileId;
        const operation = this.determineOperation(dropTarget);

        dropTarget.element.setAttribute('data-drop-target', 'true');
        dropTarget.element.setAttribute('data-drop-operation', operation);
        console.log('🐛 Set drop target:', { tileId: dropTarget.tileId, operation });
      } else {
        this.currentDropTarget = null;
        console.log('🐛 Invalid drop target:', validation.reason);
      }
    } else {
      this.currentDropTarget = null;
    }
  }

  private handleDrop(event: DragEvent) {
    event.preventDefault();
    console.log('🐛 HandleDrop:', {
      currentDraggedTile: this.currentDraggedTile,
      currentDropTarget: this.currentDropTarget,
      hasDropHandler: !!this.dropHandler
    });

    if (!this.currentDraggedTile || !this.currentDropTarget) {
      console.log('🐛 Drop failed: missing tile IDs');
      this.endDrag();
      return;
    }

    const sourceId = this.currentDraggedTile;
    const targetId = this.currentDropTarget;
    const targetElement = this.findTileElement(targetId);
    const operation = targetElement?.getAttribute('data-drop-operation') as 'move' | 'swap' || 'move';

    console.log('🐛 Executing drop:', { sourceId, targetId, operation });

    // Execute the drop through the handler
    if (this.dropHandler) {
      this.dropHandler({ sourceId, targetId, operation }).catch(error => {
        console.error('Drop operation failed:', error);
      });
    } else {
      console.log('🐛 No drop handler available');
    }

    this.endDrag();
  }

  private handleDragEnd() {
    this.endDrag();
  }

  private handleDragLeave(event: DragEvent) {
    // More aggressive cleanup - clear when leaving any tile or the viewport
    const target = event.target as Element;
    const relatedTarget = event.relatedTarget as Element | null;

    // If we're leaving a tile and not entering another tile, clear the current target
    if (target?.closest('[data-tile-id]') && !relatedTarget?.closest('[data-tile-id]')) {
      if (this.currentDropTarget) {
        const targetElement = this.findTileElement(this.currentDropTarget);
        if (targetElement) {
          targetElement.removeAttribute('data-drop-target');
          targetElement.removeAttribute('data-drop-operation');
          console.log('🐛 Cleared drop target on leave:', this.currentDropTarget);
        }
        this.currentDropTarget = null;
      }
    }

    // Also clear if we're leaving the viewport entirely
    if (target === document.body || !document.body.contains(target)) {
      this.clearAllDropTargets();
      this.currentDropTarget = null;
    }
  }

  private findDropTargetFromEvent(event: DragEvent): TileDropTarget | null {
    const element = event.target as Element;
    const tileElement = element.closest('[data-tile-id]');

    if (!tileElement) return null;

    const tileId = tileElement.getAttribute('data-tile-id');
    const ownerIdAttr = tileElement.getAttribute('data-tile-owner');

    if (!tileId) return null;

    const isOwned = ownerIdAttr ? parseInt(ownerIdAttr) === this.currentUserId : false;

    return {
      tileId,
      element: tileElement as HTMLElement,
      isOwned
    };
  }

  private findTileElement(tileId: string): HTMLElement | null {
    return document.querySelector(`[data-tile-id="${tileId}"]`);
  }

  private validateDrop(sourceId: string, target: TileDropTarget): { isValid: boolean; reason?: string } {
    if (!this.validationHandler) {
      return { isValid: false, reason: 'No validation handler' };
    }

    const sourceElement = this.findTileElement(sourceId);
    const sourceOwnerIdAttr = sourceElement?.getAttribute('data-tile-owner');
    const sourceOwned = sourceOwnerIdAttr ? parseInt(sourceOwnerIdAttr) === this.currentUserId : false;

    return this.validationHandler(sourceId, target.tileId, sourceOwned, target.isOwned);
  }

  private determineOperation(target: TileDropTarget): 'move' | 'swap' {
    // If target has content (has owner), it's a swap; otherwise it's a move
    const hasContent = target.element.getAttribute('data-tile-has-content') === 'true';
    return hasContent ? 'swap' : 'move';
  }

  /**
   * Update current user ID for ownership validation
   */
  updateUserId(userId: number) {
    this.currentUserId = userId;
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.currentDraggedTile !== null;
  }

  /**
   * Get current dragged tile ID
   */
  getDraggedTileId(): string | null {
    return this.currentDraggedTile;
  }

  /**
   * Start cleanup timer to periodically clear stale highlights
   */
  private startCleanupTimer() {
    this.stopCleanupTimer(); // Clear any existing timer
    this.cleanupTimer = window.setInterval(() => {
      // Only run cleanup if we're actually dragging
      if (this.currentDraggedTile) {
        // Check for stale highlights that don't match current state
        const allDropTargets = document.querySelectorAll('[data-drop-target="true"]');
        allDropTargets.forEach((element) => {
          const tileId = element.getAttribute('data-tile-id');
          if (tileId !== this.currentDropTarget) {
            // This tile is highlighted but not the current target - clean it up
            element.removeAttribute('data-drop-target');
            element.removeAttribute('data-drop-operation');
            console.log('🐛 Timer cleanup: removed stale highlight from', tileId);
          }
        });
      }
    }, 100); // Check every 100ms
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Export singleton instance
export const globalDragService = GlobalDragService.getInstance();