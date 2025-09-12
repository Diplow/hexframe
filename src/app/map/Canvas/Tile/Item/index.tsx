// Re-export the main component for backward compatibility
export { DynamicItemTile } from "~/app/map/Canvas/Tile/Item/item";
export type { DynamicItemTileProps } from "~/app/map/Canvas/Tile/Item/item";

// Export the color utility that was previously part of item.tsx
export { getColorFromItem } from "~/app/map/Canvas/Tile/Item/_internals/utils";