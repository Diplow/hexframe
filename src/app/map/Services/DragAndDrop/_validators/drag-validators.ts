import type { TileData } from "~/app/map/types";
import { CoordSystem } from "~/lib/domains/mapping/utils";

/**
 * Validation utilities for drag and drop operations
 */

/**
 * Check if a coordinate ID represents the center tile (empty path)
 */
export function isCenterTile(coordId: string): boolean {
  try {
    const coords = CoordSystem.parseId(coordId);
    return coords.path.length === 0;
  } catch {
    return false;
  }
}

/**
 * Check if a user can drag a specific tile
 * Rules:
 * - User must be logged in
 * - User must own the tile
 * - Center tile cannot be dragged
 */
export function canDragTile(tile: TileData | null, userId: number | undefined): boolean {
  // User must be logged in
  if (!userId) {
    return false;
  }

  // Tile must exist
  if (!tile) {
    return false;
  }

  // User must own the tile
  if (tile.metadata.ownerId !== userId.toString()) {
    return false;
  }

  // Center tile cannot be dragged
  if (isCenterTile(tile.metadata.coordId)) {
    return false;
  }

  return true;
}

/**
 * Check if a tile can be dropped on another tile (for move/swap operations)
 * Rules:
 * - All basic drag rules apply to source tile
 * - If target tile exists (swap), user must own it or it must be empty
 * - Target cannot be the center tile
 */
export function canDropOnTile(
  sourceTile: TileData | null,
  targetTile: TileData | null,
  targetCoordId: string,
  userId: number | undefined
): boolean {
  // Source tile must be draggable
  if (!canDragTile(sourceTile, userId)) {
    return false;
  }

  // Cannot drop on center tile
  if (isCenterTile(targetCoordId)) {
    return false;
  }

  // If target tile exists (swap operation), validate it
  if (targetTile) {
    // User must be logged in
    if (!userId) {
      return false;
    }

    // User must own the target tile for swaps
    if (targetTile.metadata.ownerId !== userId.toString()) {
      return false;
    }

    // Target cannot be center tile (already checked above, but double-check)
    if (isCenterTile(targetTile.metadata.coordId)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate a complete drag operation
 */
export function validateDragOperation(
  sourceCoordId: string,
  targetCoordId: string,
  sourceTile: TileData | null,
  targetTile: TileData | null,
  userId: number | undefined
): { isValid: boolean; reason?: string } {
  // Basic validation
  if (!userId) {
    return { isValid: false, reason: "User must be logged in to move tiles" };
  }

  if (!sourceTile) {
    return { isValid: false, reason: "Source tile not found" };
  }

  // Check if source can be dragged
  if (!canDragTile(sourceTile, userId)) {
    if (sourceTile.metadata.ownerId !== userId.toString()) {
      return { isValid: false, reason: "You can only move tiles you own" };
    }
    if (isCenterTile(sourceCoordId)) {
      return { isValid: false, reason: "The center tile cannot be moved" };
    }
    return { isValid: false, reason: "This tile cannot be moved" };
  }

  // Check if can drop on target
  if (!canDropOnTile(sourceTile, targetTile, targetCoordId, userId)) {
    if (isCenterTile(targetCoordId)) {
      return { isValid: false, reason: "Cannot move tiles to the center position" };
    }
    if (targetTile && targetTile.metadata.ownerId !== userId.toString()) {
      return { isValid: false, reason: "You can only swap with tiles you own" };
    }
    return { isValid: false, reason: "Cannot drop tile at this location" };
  }

  return { isValid: true };
}