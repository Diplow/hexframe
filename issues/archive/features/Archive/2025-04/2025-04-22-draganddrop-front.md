# Feature plan: drag and drop tiles (frontend)

## Problem

When organising an HexMap, one does no always get it right which hex tile is neighbor to which hex tile. One would like to exchange tile position easily.

## Context

The page responsible to expose the interface for HexMap display and interaction is the /map/[id]/page.tsx. Pages are implemented by seggregating UI components and state components. The state part is already implemented and lives in src/app/map/[id]/state.ts. The items display is also implemented through the src/app/map/[id]/HexBoard. Last the tile are implemented in src/app/map/[id]/tile.tsx.
The trpc procedure moveMapItem is implemented in src/server/api/routers/map.ts

## High level goals

Implement the frontend user experience to allow for moving tiles and exchanging tiles position:

- Allow to drag and drop a tile onto an empty tile of the same parent: it will then change the drag and dropped tile coordinates to its new coordinates.
- Allow to drag and drop a tile onto an empty tile of a different parent: it will then change the drag and dropped tile coordinates to its new coordinates AND change its parent.
- Allow to drag and drop a tile onto an other occupied tile. It will then exchange both tiles coordinates and both tiles parent (if different).

## Detailed implementation

1. Implement the moveMapItem mutation using the moveMapItem trpc procedure
2. Implement the dragAndDrop functionality to the HexBoard and Tile, binding it to the moveMapItem state event.
