// Legacy drag events coordinator removed - now handled by DOM-based drag service
// Stub exports for backward compatibility

export function setupDragStart() { /* No-op stub for backward compatibility */ }
export function setupDragOver() { /* No-op stub for backward compatibility */ }
export function handleDropEvent() { /* No-op stub for backward compatibility */ }
export function createDragState() {
  return {
    isDragging: false,
    draggedTileId: null,
    draggedTileData: null,
    dropTargetId: null,
    dropOperation: null,
    dragOffset: { x: 0, y: 0 },
  };
}
export function updateDropTarget() {
  return createDragState();
}