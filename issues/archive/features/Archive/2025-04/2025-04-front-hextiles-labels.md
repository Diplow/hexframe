# HexTile Labels

## Problem

One has to click on a HexMapTile to know what it is about.

## Context

main PAGE: src/lib/app/map/[id]/page.tsx
HexTile: src/lib/app/map/[id]/HexBoard/HexTile.tsx
HexBoard: src/lib/app/map/[id]/HexBoard/index.tsx
state: src/lib/app/map/[id]/state.ts
controls: src/lib/app/map/[id]/Controls/HexTile.tsx

## High Level Goals

Display the mapItem title on the HexTile

## Implementation

1. Add a boolean showTitles to the state
2. Pass that boolean to the HexTile through the HexBoard
3. Modify the HexTile to display the item title if it is true
