# Refactor plan: migrating from client components only to server components mostly and client components where needed

## Problem

The current implementation does not take advantage of the latest next15 and react features.

## Context

- Next15 application
- src/app/map/[id]/page.tsx -> server component that load mapData
- src/app/map/[id]/Canvas/index.tsx -> The layout for tiles
- src/app/map/[id]/State/index.ts -> state for the canvas
- src/app/map/[id]/State/mutations.ts -> state for mutating items
- src/app/map/[id]/State/selection.ts -> state for selecting tiles
- src/app/map/[id]/State/interactionMode.ts -> state for handling different ways to interact with the map
- src/app/map/[id]/Tile/item.tsx -> tile component for an item
- src/app/map/[id]/Tile/empty.tsx -> empty tile component
- src/app/map/[id]/Tile/empty-content.tsx -> content for an empty tile
- src/app/map/[id]/Tile/item-content.tsx -> content for an item tile
- src/app/map/[id]/TileLayout/index.tsx -> generic layout for tiles
- src/app/map/[id]/Tile/mutationForm.tsx -> form to handle creation on empty tiles and update on item tiles
- src/app/map/[id]/Controls/\*.tsx -> Controls that change how you navigate or interact with the map

## High level Goals

1. Move some of the state in the URL (expanded items, interactionMode, baseHexSize)
2. Separate client components (for interacting with the map) and server components (to display the map)

## Implementation details

1. Simplify useMapCanvasState
   1.1. Create an intermediate level called CanvasContainer (at the end of this refactor it will simply become the MapCanvas component) that will contain the MapCanvas. The CanvasContainer will be a server component.
   1.2. Move the getItems logic from the useMapCanvasState to the CanvasContainer server component (you can get some inspiration from the map/[id]/page.tsx file that does the same kind of work). Pass the items to the existing child components since they are not in the canvasState anymore.
   1.3. Move the scale state (State/scale.ts) to the URL. Basically baseHexSize and the expandedItems list. DeepestLevel is just a helper to compute the scale of an item, you will probably need to refactor this logic.
   1.4. Move the interactionMode state to the URL.

These first steps are kinda done (besides some details: we don't need an intermediate CanvasContainer anymore, items don't look like they are correctly passed to the correct children component (and that they still rely on items from the state, and other problems).

But for now let's keep moving by installing Storybook and exposing different tile components (empty tiles and item tiles) with mock data to adjust their design. In particular what is exposed should not have any state. Implement these different components to expose them via storybook, we will integrate then to the codebase in a 2nd time:

- src/app/map/[id]/Tile/item.static.tsx
- src/app/map/[id]/Tile/empty.static.tsx
- src/app/map/[id]/TileLayouts/base.static.tsx
- src/app/map/[id]/Canvas/hex-region.static.tsx
- src/app/map/[id]/Canvas/index.static.tsx
