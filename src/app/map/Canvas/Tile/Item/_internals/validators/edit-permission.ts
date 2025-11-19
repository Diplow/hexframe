/**
 * Validates if a user has permission to edit a tile
 * Currently implements simple ownership check
 *
 * @param currentUserId - The ID of the current user (optional if not logged in)
 * @param ownerId - The ID of the tile owner
 * @returns true if the user can edit the tile, false otherwise
 */
export function canEditTile(currentUserId: string | undefined, ownerId: string): boolean {
  // User must be logged in to edit
  if (!currentUserId) {
    return false;
  }

  // User can only edit their own tiles
  return currentUserId === ownerId;
}