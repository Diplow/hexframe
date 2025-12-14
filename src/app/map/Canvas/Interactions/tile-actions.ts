/**
 * Tile action handlers for Canvas component
 * Provides default implementations for tile interactions
 */

// Shared no-op and utility functions
function _noop() { /* No-op */ }
function _returnTrue() { return true as const; }
function _returnFalse() { return false as const; }
function _returnNull() { return null; }

// Pre-built tile action object for reuse
const TILE_ACTIONS = {
  handleTileClick: _noop as (coordId: string, event: MouseEvent) => void,
  handleTileHover: _noop as (coordId: string, isHovering: boolean) => void,
  onCreateTileRequested: _noop as (coordId: string) => void,
  dragHandlers: { onDragStart: _noop, onDragOver: _noop, onDragLeave: _noop, onDrop: _noop, onDragEnd: _noop },
  canDragTile: _returnTrue,
  isDraggingTile: _returnFalse,
  isDropTarget: _returnFalse,
  isValidDropTarget: _returnFalse,
  isDragging: false,
  getDropOperation: _returnNull,
};

export function createTileActions() {
  return {
    ...TILE_ACTIONS,
    dragHandlers: { ...TILE_ACTIONS.dragHandlers },
  };
}
