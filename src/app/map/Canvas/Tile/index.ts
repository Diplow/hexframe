// Base components
export { BaseTileLayout } from "./Base/BaseTileLayout";
export { BaseTileLayout as StaticBaseTileLayout } from "./Base/BaseTileLayout"; // Alias for backward compatibility
export type {
  BaseTileLayoutProps,
  BaseTileLayoutProps as StaticBaseTileLayoutProps, // Alias for backward compatibility
  TileScale,
  TileColor,
  TileStroke,
  TileCursor,
} from "./Base/BaseTileLayout";

// Item components
export { DynamicItemTile } from "./Item/item";
export type { DynamicItemTileProps } from "./Item/item";

// Empty tile components
export { DynamicEmptyTile } from "./Empty/empty";
export type { DynamicEmptyTileProps } from "./Empty/empty";

// Button components
export { DynamicTileButtons as TileButtons } from "./Item/item.buttons";
export type { TileButtonsProps } from "./Item/item.buttons";

// Auth components
export { default as DynamicAuthTile } from "./Auth/auth";
export type { AuthTileProps as DynamicAuthTileProps } from "./Auth/auth";
