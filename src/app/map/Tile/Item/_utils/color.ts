import type { TileData } from "~/app/map/types/tile-data";
import type { TileColor } from "~/app/map/Canvas/base/BaseTileLayout";

/**
 * Extracts color configuration from a tile's data
 * Handles both old format ("colorName-tint") and new semantic format ("direction-depth-n")
 * 
 * @param item - The tile data containing color information
 * @returns TileColor object or semantic color string
 */
export function getColorFromItem(item: TileData): TileColor | string {
  // Validate color string format
  if (!item.data.color || typeof item.data.color !== 'string') {
    console.warn(`Invalid color data: expected string, got ${typeof item.data.color}`);
    return { color: "zinc", tint: "50" }; // Default fallback
  }
  
  // Check if it's the new semantic format (e.g., "nw-depth-1", "center-depth-0")
  if (item.data.color.includes('-depth-')) {
    return item.data.color; // Return as-is for new format
  }
  
  // Handle old format
  const parts = item.data.color.split("-");
  
  // Check if color string has correct format (colorName-tint)
  if (parts.length !== 2) {
    console.warn(`Invalid color format: "${item.data.color}". Expected "color-tint" format.`);
    return { color: "zinc", tint: "50" }; // Default fallback
  }
  
  const [colorName, tint] = parts;
  
  // Additional validation could be added here to check if colorName and tint
  // are valid values according to TileColor type constraints
  if (!colorName || !tint) {
    console.warn(`Invalid color parts: colorName="${colorName}", tint="${tint}"`);
    return { color: "zinc", tint: "50" }; // Default fallback
  }
  
  return {
    color: colorName as TileColor["color"],
    tint: tint as TileColor["tint"],
  };
}