# Initialize some story book stories

## Problem

I don't have clear static (stateless components) component implementation to check whether my tiles look the way they should.

## Context

Get some inspiration from the current implementation but don't modify those files:

- src/app/map/[id]/Tile/item.dynamic.tsx
- src/app/map/[id]/Tile/empty.dynamic.tsx
- src/app/map/[id]/TileLayouts/index.tsx
- src/app/map/[id]/Canvas/HexRegion.tsx
- src/app/map/[id]/Canvas/index.tsx

## High Level Goals

Implement the following components in the following files and their associated story. You probably can simplify implementations a lot in the static.tsx files because you can assume you get all that you need from state in props.

- StaticItemTile: src/app/map/[id]/Tile/item.static.tsx
- src/app/map/[id]/Tile/item.static.stories.ts
- StaticEmptyTile: src/app/map/[id]/Tile/empty.static.tsx
- src/app/map/[id]/Tile/empty.static.stories.ts
- StaticBaseTileLayout: src/app/map/[id]/TileLayouts/base.static.tsx
- src/app/map/[id]/TileLayouts/base.static.stories.ts
- StaticHexRegion: src/app/map/[id]/Canvas/hex-region.static.tsx
- src/app/map/[id]/Canvas/hex-region.static.stories.ts
- StaticMapCanvas: src/app/map/[id]/Canvas/index.static.tsx
- src/app/map/[id]/Canvas/index.static.stories.ts

At the end, we should be able to check the different static items stories in storybook.
