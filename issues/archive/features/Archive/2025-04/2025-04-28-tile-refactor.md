# Feature Plan: Tile Refactor

## Problem

The Tile component is hardly readable and does not expose well thought abstractions.

## Context

The current implementation consist of the following files:

- Tile/index.tsx: the main component
- Tile/TileContent.tsx: an abstraction to display the tile data
- Canvas/State/draganddrop.ts: state logic to handle drag and drop
- Tile/OverlayButtons: I think it is outdated, it used to be to display buttons on the tile content

The Canvas/HexRegion.tsx is the only place that use these Tiles.

## High level goals

1. Have a Tile/layout.tsx file that will handle the generic hexagon shape and color of the tile (I have already started an implementation) by exposing a function `TileLayout`
2. Have a Tile/empty.tsx file that will represent empty tiles and expose an `<EmptyTile />` component
3. Have a Tile/item.tsx file that will represent item tiles and expose an `<ItemTile />` component
4. Have a Tile/content.tsx file that will expose a `<TileContent />`
5. Remove all state from the tile directly and just use a hook useGenericTileState defined in Canvas/State/tile.ts

The first level of abstraction of all these abstractions (TileLayout, EmptyTile, ItemTile, TileContent, useGenercTileState) should be extra clear and aggressively use abstractions to make it extra readable.

## Implementations steps

1. Create/update the Tile/layout.tsx file:
2. Create Tile/empty.tsx file:

   - Implement the EmptyTile component that uses TileLayout
   - Add appropriate styling for empty tiles (zinc coloring, hover states)
   - Include click handlers to support tile selection

3. Create Tile/content.tsx file:

   - Move and refactor the existing TileContent code
   - Separate display logic from editing logic
   - Create clear interfaces for displaying content at different scale levels
   - Clean up the content rendering for better readability

4. Create Tile/item.tsx file:

   - Implement the ItemTile component using TileLayout
   - Integrate the TileContent component
   - Handle proper coloring based on item data

5. Create Canvas/State/tile.ts file:

   - Implement useGenericTileState hook that extracts state logic from current Tile component
   - Move click handling (selection, expand/collapse) logic into this hook
   - Move all item modification actions (create, update, delete) into this hook

6. Refactor Tile/State/draganddrop.ts:

   - Simplify to work with the new tile structure
   - Ensure it can be used with both ItemTile and EmptyTile components
   - Improve the type interfaces for better readability

7. Update Canvas/HexRegion.tsx:

   - Update import paths and component usage
   - Replace Tile usage with EmptyTile or ItemTile as appropriate

8. Create Tile/index.tsx barrel file:

   - Export all components from a single entry point
   - Potentially include a backward-compatible Tile component that internally uses the new components

9. Remove Tile/OverlayButtons if it's outdated
