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
  operation: 'copy' | 'move';
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
  private currentUserId: string | null = null;
  private cleanupTimer: number | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): GlobalDragService {
    GlobalDragService.instance ??= new GlobalDragService();
    return GlobalDragService.instance;
  }

  /**
   * Initialize the service - should be called once when the app starts
   */
  initialize(options: {
    dropHandler: DropHandler;
    validationHandler: ValidationHandler;
    currentUserId: string;
  }) {

    if (this.isInitialized) {
      // Update handlers if already initialized
      this.dropHandler = options.dropHandler;
      this.validationHandler = options.validationHandler;
      this.currentUserId = options.currentUserId;
      return;
    }

    this.dropHandler = options.dropHandler;
    this.validationHandler = options.validationHandler;
    this.currentUserId = options.currentUserId;

    this.attachEventListeners();
    this.isInitialized = true;
  }

  /**
   * Start dragging a tile - called from tile's onDragStart
   */
  startDrag(tileId: string, event: DragEvent) {

    if (!this.isInitialized) {
      event.preventDefault();
      return;
    }

    this.currentDraggedTile = tileId;

    // Set up drag data
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', tileId);

    // Add CSS class to indicate drag is active
    document.body.setAttribute('data-drag-active', 'true');

    // Track ctrl key state for copy/move operation
    // Default: copy (no ctrl), ctrl+drag: move
    const operationType = event.ctrlKey ? 'move' : 'copy';
    document.body.setAttribute('data-drag-operation-type', operationType);

    // Start cleanup timer as a safety net (clear stale highlights every 100ms)
    this.startCleanupTimer();

    // Mark the dragged tile
    const draggedElement = this.findTileElement(tileId);
    if (draggedElement) {
      draggedElement.setAttribute('data-being-dragged', 'true');
    } else {
    }
  }

  /**
   * End drag operation
   */
  private endDrag() {

    // Clean up CSS classes
    document.body.removeAttribute('data-drag-active');
    document.body.removeAttribute('data-drag-operation-type');

    if (this.currentDraggedTile) {
      const draggedElement = this.findTileElement(this.currentDraggedTile);
      if (draggedElement) {
        draggedElement.removeAttribute('data-being-dragged');
      }
    }

    // Clean up ALL drop targets to prevent stale highlights
    this.clearAllDropTargets();

    // Stop cleanup timer
    this.stopCleanupTimer();

    this.currentDraggedTile = null;
    this.currentDropTarget = null;
  }

  /**
   * Clear all drop target highlights - more aggressive cleanup
   */
  private clearAllDropTargets() {
    const allDropTargets = document.querySelectorAll('[data-drop-target="true"]');

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

    // Update ctrl key state during drag (allows switching between copy/move mid-drag)
    const operationType = event.ctrlKey ? 'move' : 'copy';
    document.body.setAttribute('data-drag-operation-type', operationType);

    const dropTarget = this.findDropTargetFromEvent(event);

    // Check if target or operation type changed
    const currentOperation = document.body.getAttribute('data-drag-operation-type') as 'copy' | 'move';
    const prevOperation = dropTarget ?
      this.findTileElement(dropTarget.tileId)?.getAttribute('data-drop-operation') : null;

    const targetChanged = dropTarget?.tileId !== this.currentDropTarget;
    const operationChanged = currentOperation !== prevOperation;

    // No change in target or operation
    if (!targetChanged && !operationChanged && dropTarget?.tileId === this.currentDropTarget) {
      return;
    }

    // Clear previous target if target changed
    if (targetChanged && this.currentDropTarget) {
      const prevElement = this.findTileElement(this.currentDropTarget);
      if (prevElement) {
        prevElement.removeAttribute('data-drop-target');
        prevElement.removeAttribute('data-drop-operation');
      }
    }

    // Set new target or update operation
    if (dropTarget && dropTarget.tileId !== this.currentDraggedTile) {
      const validation = this.validateDrop(this.currentDraggedTile, dropTarget);

      if (validation.isValid) {
        this.currentDropTarget = dropTarget.tileId;

        dropTarget.element.setAttribute('data-drop-target', 'true');
        dropTarget.element.setAttribute('data-drop-operation', operationType);
      } else {
        this.currentDropTarget = null;
      }
    } else {
      this.currentDropTarget = null;
    }
  }

  private handleDrop(event: DragEvent) {
    event.preventDefault();

    if (!this.currentDraggedTile || !this.currentDropTarget) {
      this.endDrag();
      return;
    }

    const sourceId = this.currentDraggedTile;
    const targetId = this.currentDropTarget;

    // Get operation type from body attribute (most reliable source, updated during dragover)
    const operation = (document.body.getAttribute('data-drag-operation-type') as 'copy' | 'move') || 'copy';

    // Execute the drop through the handler
    if (this.dropHandler) {
      this.dropHandler({ sourceId, targetId, operation }).catch(error => {
        console.error('Drop operation failed:', error);
        // Emit error event for user feedback
        if (error instanceof Error) {
          // Dispatch custom event that cache provider can handle
          document.dispatchEvent(new CustomEvent('drag-drop-error', {
            detail: { message: error.message }
          }));
        }
      });
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

    const isOwned = ownerIdAttr ? ownerIdAttr === this.currentUserId : false;

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
    const sourceOwned = sourceOwnerIdAttr ? sourceOwnerIdAttr === this.currentUserId : false;

    return this.validationHandler(sourceId, target.tileId, sourceOwned, target.isOwned);
  }

  /**
   * Update current user ID for ownership validation
   */
  updateUserId(userId: string) {
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