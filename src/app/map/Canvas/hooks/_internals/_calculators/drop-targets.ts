import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { TileData } from "~/app/map/types";
import { canSwapTiles } from "~/app/map/Canvas/hooks/_internals/_validators";

/**
 * @deprecated This function is no longer needed with universal drop targets.
 * Kept for backward compatibility but will be removed in future.
 */
export function getValidDropTargets(
  _draggedTileId: string,
  _items: Record<string, TileData>
): string[] {
  // With the new approach, we don't pre-calculate valid targets
  // Every user-owned tile (except root) is a potential target
  return [];
}

export function isValidDropTarget(
  targetCoordId: string,
  draggedTileId: string | null,
  getItem: (coordId: string) => TileData | null,
  currentUserId: number | null
): boolean {
  if (!draggedTileId || !currentUserId) {
    return false;
  }
  
  // Can't drop on self
  if (targetCoordId === draggedTileId) {
    return false;
  }
  
  // Parse target coordinates
  const targetCoords = CoordSystem.parseId(targetCoordId);
  
  // Can't drop on root tiles
  if (targetCoords.path.length === 0) {
    return false;
  }
  
  // Check if this would be a problematic swap
  const targetTile = getItem(targetCoordId);
  if (targetTile && !canSwapTiles(draggedTileId, targetCoordId)) {
    // This swap would cause issues in the backend
    return false;
  }
  
  // Check if the target position is in a space the user can access
  // For empty tiles, we need to check if they would be owned by the user
  // For occupied tiles, we'll check ownership during the swap operation
  // For now, allow any position that's not root and not self
  // The actual ownership check will happen when determining move vs swap
  
  // All other positions in user's space are valid drop targets
  // The actual operation (move vs swap) will be determined on drop
  return true;
}

/**
 * Determines the operation type based on target occupancy
 */
export function getDropOperationType(
  targetCoordId: string,
  getItem: (coordId: string) => TileData | null
): 'move' | 'swap' {
  const hasItem = getItem(targetCoordId) !== null;
  return hasItem ? 'swap' : 'move';
}