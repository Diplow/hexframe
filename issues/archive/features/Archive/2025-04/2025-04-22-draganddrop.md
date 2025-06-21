# Feature plan: drag and drop tiles (backend)

## Problem

When organising an HexMap, one does no always get it right which hex tile is neighbor to which hex tile. One would like to exchange tile position easily.

## Context

The page responsible to expose the interface for HexMap display and interaction is the /map/[id]/page.tsx. Pages are implemented by seggregating UI components and state components. The state part is already implemented and lives in src/app/map/[id]/state.ts. The items display is also implemented through the src/app/map/[id]/HexBoard. Last the tile are implemented in src/app/map/[id]/tile.tsx.

## High level goals

Implement the backend routes to allow for moving tiles and exchanging tiles position:

- Allow to drag and drop a tile onto an empty tile of the same parent: it will then change the drag and dropped tile coordinates to its new coordinates.
- Allow to drag and drop a tile onto an empty tile of a different parent: it will then change the drag and dropped tile coordinates to its new coordinates AND change its parent.
- Allow to drag and drop a tile onto an other occupied tile. It will then exchange both tiles coordinates and both tiles parent (if different).

## Detailed implementation

1. The service (src/lib/domains/mapping/services/hex-map.ts) will expose a new method: moveMapItem({ mapId: string, oldCoords: HexCoord, newCoords: HexCoord }) that will change the mapItem.attrs.coords of map mapId to newCoords if they were oldCoords. This method will raise an error if newCoords are occupied or if oldCoords and newCoords don't have the same parent.
   Guidance: follow these rules:

- back-domain-services.mdc
- back-domain-actions.mdc
- back-domain-repositories.mdc

2. Test this new method in src/lib/domains/mapping/services/**tests**/hex-map.suite.ts
   Guidance: follow the rule back-testing-domain-services.mdc
3. Remove the error when newCoords and oldCoords don't have the same parent, implement the parent update and update the test.
4. Remove the error when newCoords is occupied and swap both items coordinates and parents, update the test.
5. Implement the trpc procedure that exposes the service moveMapItem method.
