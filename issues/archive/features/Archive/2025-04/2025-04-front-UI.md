# Feature Plan: HexMap Display and Interaction Flow

## 1. Problem Statement

Backend is ready to handle HexMap data management: but we can not yet interact through a frontend interface. This feature is about exposing the API operations through a user interface.

## 2. Context

The backend data management is exposed through a tRPC API defined in src/server/api/routers/map (exposed via src/server/api/root). The frontend application is a nextJS application using app router. The page responsible to expose the interface for HexMap display and interaction is the /map/[id] page. Pages are implemented by seggregating UI components and state components. This feature is about implementing the state part. The state part is already implemented and lives in src/app/map/[id]/View/state.ts.

## 3. High-Level Goal

1. Implement the view in src/app/map/[id]/page.tsx

## 4. Implementation

Guidance:

- should not use any state besides `useHexMapViewState`
- pass state as props to children components

1. Step 1: Implementing a HexBoard Component (src/app/map/[id]/HexBoard/index.tsx) that displays an HexGrid of empty tiles and replaces empty tiles by an HexTile representing the mapItem at this coord (in particular the hextile will be filled with mapItem.color). For now, the HexGrid are just 1 central HexTiles with 1 adjacent HexTile for each neighbor 7 HexTiles total).

2. Step 2: Implementing a BottomDrawer (src/app/map/[id]/BottomDrawer) that draws from the bottom of the screen. When closed, it only displays the map.title. It opens when selecting a tile and it then display the information of the mapItem. It closes when manually closed or when selecting an empty tile.
