// Barrel export for Base tile subsystem

// BaseTileLayout - Core hexagonal tile layout component
export { BaseTileLayout } from "~/app/map/Canvas/Tile/Base/BaseTileLayout";
export type {
  TileCursor,
  TileStroke,
  TileScale,
  TileColor,
  BaseTileLayoutProps,
} from "~/app/map/Canvas/Tile/Base/BaseTileLayout";

// DynamicBaseTileLayout - Dynamic variant with client-side features
export { DynamicBaseTileLayout } from "~/app/map/Canvas/Tile/Base/DynamicBaseTileLayout";
export type { DynamicBaseTileLayoutProps } from "~/app/map/Canvas/Tile/Base/DynamicBaseTileLayout";

// BaseFrame - Frame component showing center + 6 children
export { BaseFrame } from "~/app/map/Canvas/Tile/Base/BaseFrame";

// Gradient utilities
export { renderTileGradient, renderStaticTileGradients } from "~/app/map/Canvas/Tile/Base/gradient";

// Base components (static, non-interactive)
export { BaseItemTile } from "~/app/map/Canvas/Tile/Base/_components/BaseItemTile";
export { BaseEmptyTile } from "~/app/map/Canvas/Tile/Base/_components/BaseEmptyTile";
