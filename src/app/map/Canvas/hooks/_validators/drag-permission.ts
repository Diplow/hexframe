import type { TileData } from "~/app/map/types/tile-data";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";

export function canDragTile(
  tile: TileData | null | undefined,
  currentUserId: number | null
): boolean {
  if (!currentUserId || !tile) {
    return false;
  }
  
  // Check ownership (convert to string for comparison)
  if (tile.metadata.ownerId !== String(currentUserId)) {
    return false;
  }
  
  // Check if it's not a root tile (UserTile)
  const coords = CoordSystem.parseId(tile.metadata.coordId);
  if (coords.path.length === 0) {
    return false;
  }
  
  return true;
}

export function canSwapTiles(
  sourceCoordId: string,
  targetCoordId: string
): boolean {
  const sourceCoords = CoordSystem.parseId(sourceCoordId);
  const targetCoords = CoordSystem.parseId(targetCoordId);
  
  // Prevent swapping a tile with its direct sibling's immediate child
  // Example: Can't swap 0,0:1 with 0,0:2,1 where 0,0:2 is sibling of 0,0:1
  
  // Check if source and target have the same user/group
  if (sourceCoords.userId !== targetCoords.userId || sourceCoords.groupId !== targetCoords.groupId) {
    return false; // Prevent swaps between different user spaces
  }
  
  // Check the specific problematic pattern in both directions
  // Pattern 1: source at depth 1, target at depth 2
  if (sourceCoords.path.length === 1 && targetCoords.path.length === 2) {
    const sourceDirection = sourceCoords.path[0];
    const targetParentDirection = targetCoords.path[0];
    
    // If target's parent is different from source, they might be siblings
    if (sourceDirection !== targetParentDirection) {
      // This is the problematic case: source and target's parent are siblings
      return false;
    }
  }
  
  // Pattern 2: target at depth 1, source at depth 2 (reverse case)
  if (targetCoords.path.length === 1 && sourceCoords.path.length === 2) {
    const targetDirection = targetCoords.path[0];
    const sourceParentDirection = sourceCoords.path[0];
    
    if (targetDirection !== sourceParentDirection) {
      return false;
    }
  }
  
  // Additional check: prevent swapping if one tile is ancestor of the other
  // This catches cases like swapping 0,0:1 with 0,0:1,2,3
  const sourcePath = sourceCoords.path.join(',');
  const targetPath = targetCoords.path.join(',');
  
  if (sourcePath.startsWith(targetPath + ',') || targetPath.startsWith(sourcePath + ',')) {
    // One is ancestor of the other
    return false;
  }
  
  return true;
}