# Feature plan: fix tile editing and creating

## Problem

The current implementation revolves around state management at the tile content level. This is inefficient since there are a lot of tiles and tile-contents.

## Context

- Next15 application
- src/app/map/[id]/page.tsx
- src/app/map/[id]/State/\*.ts -> state for the map page
- src/app/map/[id]/Canvas/index.tsx -> The layout for tiles
- src/app/map/[id]/Canvas/State/index.ts -> state for the canvas
- src/app/map/[id]/Canvas/State/mutations.ts -> state for mutating items
- src/app/map/[id]/Canvas/State/selection.ts -> state for selecting tiles
- src/app/map/[id]/Tile/item.tsx -> tile component for an item
- src/app/map/[id]/Tile/empty.tsx -> empty tile component
- src/app/map/[id]/Tile/empty-content.tsx -> content for an empty tile
- src/app/map/[id]/Tile/item-content.tsx -> content for an item tile
- src/app/map/[id]/TileLayout/index.tsx -> generic layout for tiles
- src/app/map/[id]/Tile/mutationForm.tsx -> form to handle creation on empty tiles and update on item tiles
- src/app/map/[id]/Controls/\*.tsx -> Controls that change how you navigate or interact with the map

## High level goals

1. Remove state logic from the content files (empty-content.tsx and item-content.tsx) and move it to the canvas state.
2. Update the create/update mode to trigger the clicked tile "mutation state" (i.e displaying the mutation form)

## Implementation Steps

1. Create state for the tile you want to mutate in mutations.ts
   `[tileToMutate, setTileToMutate] = useState<string|null>(null)` where the string is the coordinates of the tile to mutate
2. Expose it in the canvas state and use it in the content files (empty and items) instead of the local state.
3. Update the edit click logic in the Canvas component to setTileToMutate to the clicked tile
