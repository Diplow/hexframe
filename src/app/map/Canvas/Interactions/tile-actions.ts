/**
 * Tile action handlers for Canvas component
 * Provides default implementations for tile interactions
 */

// Constant no-op function for legacy compatibility
const _noop = () => { /* No-op for backward compatibility */ };

// Pre-built tile action object for reuse
const TILE_ACTIONS = {
  handleTileClick: (_coordId: string, _event: MouseEvent) => {
    // Default tile click behavior (can be enhanced later)
  },
  handleTileHover: (_coordId: string, _isHovering: boolean) => {
    // TODO: Handle hover state
  },
  onCreateTileRequested: (_coordId: string) => {
    // This callback is used by empty tiles to signal create requests
  },
  dragHandlers: {
    onDragStart: _noop,
    onDragOver: _noop,
    onDragLeave: _noop,
    onDrop: _noop,
    onDragEnd: _noop,
  },
  canDragTile: () => true,
  isDraggingTile: () => false,
  isDropTarget: () => false,
  isValidDropTarget: () => false,
  isDragging: false,
  getDropOperation: () => null,
};

export function createTileActions() {
  return TILE_ACTIONS;
}
