# Feature plan: replace the scaling of tiles with hexagonal tiles, just bigger

## Problem

The scale logic is too complicated.

## Context

- Next15 application
- src/app/map/[id]/page.tsx
- src/app/map/[id]/State/.ts -> state for the map page
- src/app/map/[id]/Canvas/index.tsx -> The layout for tiles
- src/app/map/[id]/Canvas/State/index.ts -> state for the canvas
- src/app/map/[id]/Tile/index.tsx -> The tile component

## High Level Goals

1. Rework scale state
2. Rework the HexRegion implementation

## Implementation Steps

1. Scale 2 tiles have a BaseHexSize 4 times larger than Scale 1 tile
2.
3. Add the deepestChild: number to HexTileData and c
   You must implement Side Regions first to scale the center accordingly, starting with the region with the deeper item.
