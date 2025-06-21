# Feature plan: expand and collapse via navigation

## Problem

We currently can not expand and collapse item tiles.

## Context

Please read those files:

- page: src/app/map/[id]/page.tsx
- CanvasMap: src/app/map/[id]/Canvas/index.static.tsx
- HexRegion: src/app/map/[id]/Canvas/hex-region.static.tsx
- TileLayout: src/app/map/[id]/Tile/base.static.tsx
- TileItem: src/app/map/[id]/Tile/item.static.tsx

## High Level Goals

Make TileItems clickable links that will expand them (or collapse them if they are already expanded)

## Implementation

- use Link from next/navigation
- give feedback when hovering those links with a cursor style (zoom in if expandable, zoom out if collapsable)
