# HexTile Labels

## Problem

There are currently a duplication of items when zooming in. Center children exist both as center side hex and as HexBoardLvl1 center.

## Context

main PAGE: src/lib/app/map/[id]/page.tsx
HexTile: src/lib/app/map/[id]/HexBoard/HexTile.tsx
HexBoard: src/lib/app/map/[id]/HexBoard/index.tsx
state: src/lib/app/map/[id]/state.ts
controls: src/lib/app/map/[id]/Controls/HexTile.tsx

## High Level Goals

When zooming in, we need not to display children immediatly but to display larger tiles (the shape of a HexBoardLvl0 but a single tile) that can then be expanded into a regular HexBoardLvl0 containing the children of the expanded tile.

## Implementation Details

1.  **Rename `HexTile`**: Rename `HexTile` to `Lvl0Tile` and update references. This component represents a single hex at zoom level 0.
2.  **Implement `Lvl1Tile`**: Create `src/app/map/[id]/HexBoard/Lvl1/tile.tsx`.
    - It should render a single SVG path outlining the shape of a 7-hex cluster (like `HexBoardLvl0` but as one visual element).
    - It accepts the same props as `Lvl0Tile` (`item`, `color`, `isSelected`, `showTitles`, `onClick`). The `onClick` might be used for selection, but not expansion.
    - It should display the `item.name` if `showTitles` is true.
    - Add a distinct "expand" button (e.g., an icon button overlaid on the tile) visible when the tile is hovered or selected.
3.  **State Management (`useHexMapViewState`)**:
    - Add a new state variable: `expandedLvl1Tiles: Map<string, boolean> = new Map()`. This map stores the coordinate IDs (`HexCoordSystem.createId(coord)`) of tiles expanded at Lvl 1.
    - Modify `zoomLevel` state logic. Direct `zoomIn`/`zoomOut` might be removed or repurposed. Zoom level changes will be driven by expansion/collapse actions.
4.  **`Lvl0Tile` Modifications**:
    - Add an "expand" button (e.g., an icon button).
    - This button is only visible/enabled if the `item` associated with the tile has children (check `item.neighborIds.length > 0`).
    - Define a new event handler in `useHexMapViewState`, e.g., `expandLvl0Tile(coord: HexCoord)`.
    - When the "expand" button is clicked on `Lvl0Tile`:
      - Call `expandLvl0Tile(coord)`.
      - This handler sets `zoomLevel = 1`.
      - It adds the `coord`'s ID to the `expandedLvl1Tiles` map: `setExpandedLvl1Tiles(new Map(expandedLvl1Tiles.set(coordId, true)))`.
      - It sets the `centerCoordinate` to the `coord` of the tile being expanded.
5.  **`HexBoardLvl1` Implementation (`src/app/map/[id]/HexBoard/Lvl1/index.tsx`)**:
    - This board arranges items visually like `HexBoardLvl0`.
    - For each position, it checks the `expandedLvl1Tiles` state map using the tile's coordinate ID.
    - If `expandedLvl1Tiles.get(coordId)` is true, render a `HexBoardLvl0` component for that tile, passing the relevant children items and the coordinate.
    - If `expandedLvl1Tiles.get(coordId)` is false or undefined, render an `Lvl1Tile` component.
    - The "expand" button on an `Lvl1Tile` within this board calls a new handler, e.g., `expandLvl1Tile(coord: HexCoord)`, which simply adds the `coordId` to the `expandedLvl1Tiles` map.
6.  **Collapse Functionality**:
    - Modify the `HexBoardLvl0` component slightly: when rendered _inside_ `HexBoardLvl1` (perhaps via a new prop like `isExpandedTile={true}`), its _center_ tile should display a "collapse" button instead of an "expand" button.
    - Define a new event handler, e.g., `collapseLvl1Tile(coord: HexCoord)`.
    - The "collapse" button calls `collapseLvl1Tile(coord)`.
    - This handler:
      - Removes the `coordId` from the `expandedLvl1Tiles` map.
      - Checks if `expandedLvl1Tiles` is now empty. If yes, set `zoomLevel = 0`.
7.  **Remove Old Zoom Controls**: Remove the dedicated zoom in/out buttons from the `Controls` component (`src/app/map/[id]/Controls.tsx`) as zooming is now handled via expand/collapse. Keep the show titles toggle.

## Previous Plan (for reference)

1. Implement a Lvl1Tile in src/app/map/[id]/HexBoard/Lvl1/tile.tsx

- It should have the shape and size of an HexBoardLvl0 (6 hexes around a central one)
- It should take the same props than an HexTile (it will work the same way, just with a different shape)
- It should not have inner strokes

2. When zoomin in from lvl 0 to lvl 1, one should use exactly a HexBoardLvl0 BUT with a Lvl1Tile instead of an HexTile.
3. Add an expand action to the Lvl1Tile that will replace the Lvl1Tile with an HexBoardLvl0 like it is right now.
4. Remove the zoom events and add the expand button to each tile that has children. When expanding a HexTile (that could be renamed Lvl0Tile) via a new event `expand`, we zoom in AND expand the Lvl1Tile that has the same item as the expanded HexTile. Other HexTiles of the map become Lvl1Tile but are not expanded.
