import type { TileData } from "~/app/map/types/tile-data";
import type { TileColor } from "~/app/map/components/BaseTileLayout";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import { getColor as calculateColor } from "~/app/map/types/tile-data";

/**
 * Calculates the preview color for a tile during a swap operation
 * Shows what color the tile would have after the swap completes
 * 
 * @param item - The tile data
 * @param isDropTargetActive - Whether this tile is currently a drop target
 * @param dropOperation - The type of drop operation (swap/move/null)
 * @returns The color to display for the tile
 */
export function getSwapPreviewColor(
  item: TileData,
  isDropTargetActive: boolean,
  dropOperation: 'move' | 'swap' | null
): TileColor | string {
  // If not an active swap target, use normal color
  if (!isDropTargetActive || dropOperation !== 'swap') {
    return item.data.color;
  }

  try {
    // For swap operations, show preview of the color it would have after swap
    // The dragged tile would take this position's coordinates
    const targetCoords = CoordSystem.parseId(item.metadata.coordId);
    const previewColorString = calculateColor(targetCoords);
    
    // The new getColor returns semantic classes like "nw-depth-1"
    // Just return it as-is since our tile components now handle both formats
    return previewColorString;
  } catch (error) {
    console.error(`Error calculating swap preview color:`, error);
    return item.data.color; // Fallback to current color on any error
  }
}