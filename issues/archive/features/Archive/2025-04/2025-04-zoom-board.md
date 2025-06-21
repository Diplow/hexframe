# Feature Plan: HexMap Zoom

## 1. Problem Statement

One can see a map with 7 Hex, 1 central and 1 on each sides. One can read a "side hex" as "meaningful context" to understand the central one. But if we want to give extra context "one level deeper", which means creating side hex to side hex, we can not anymore.

## 2. Context

The backend data management is exposed through a tRPC API defined in src/server/api/routers/map (exposed via src/server/api/root) and should not be affected by this "zoom" feature because the hex coordinate system already allow to define neighbor to a "non depth 0 coordinate".

The frontend application is a nextJS application using app router. The page responsible to expose the interface for HexMap display and interaction is the /map/[id] page. This feature is about implementing modification the HexBoard component (state modification is already done).

## 3. High-Level Goal

Implement Zoom level 1.

## 4. Implementation

1. Step 1: Absract HexBoard into an HexBoardLvl0 that takes a centerTile as input

2. Step 2: Implement HexBoardLvl1 which is relative to HexBoardLvl0 the same as HexBoardLvl0 relative to HexTile. When going from zoom level 0 to zoom level 1, each HexTile from the HexBoardLvl0 becomes the central Tile of a new HexboardLvl0.
