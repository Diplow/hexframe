// Re-export the main component for backward compatibility
export { DynamicItemTile } from "./item";
export type { DynamicItemTileProps } from "./item";

// Export the color utility that was previously part of item.tsx
export { getColorFromItem } from "./_utils";