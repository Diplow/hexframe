# Feature Plan: HexMap Display and Interaction Flow

## 1. Problem Statement

Backend and state are ready to handle mapItems creation and deletion but we can not yet interact through a frontend interface. This feature is about exposing the state operations through a user interface.

## 2. Context

The page responsible to expose the interface for HexMap display and interaction is the /map/[id] page. Pages are implemented by seggregating UI components and state components. The state part is already implemented and lives in src/app/map/[id]/View/state.ts.

## 3. High-Level Goal

1. Create a RightDrawer in src/app/map/[id]/RightDrawer/index.tsx that will present a form to create a new Item.
2. Use the RightDrawer in the view in src/app/map/[id]/page.tsx and pass it the state props it needs.
3. Add the removeItem capability in the BottomDrawer

## 4. Implementation

Guidance:

- should not use any state besides `useHexMapViewState`
- pass state as props to children components

1. Step 1: Implementing a RightDrawer Component (src/app/map/[id]/RightDrawer/index.tsx) that opens when selecting an empty tile and exposes a form to create a new Item at this HexTile.

2. Step 2: Modify the BottomDrawer to allow for selectedItem removal.
