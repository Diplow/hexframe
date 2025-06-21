# Feature Plan: HexMap Display and Interaction Flow

## 1. Problem Statement

Backend is ready to handle HexMap data management: but we can not yet interact through a frontend interface. This feature is about exposing the API operations through a user interface.

## 2. Context

The backend data management is exposed through a tRPC API defined in src/server/api/routers/map (exposed via src/server/api/root). The frontend application is a nextJS application using app router. The page responsible to expose the interface for HexMap display and interaction is the /map/[id] page. Pages are implemented by seggregating UI components and state components. This feature is about implementing the state part. The state part follow certain conventions defined in the rule front-local-state-management-hook.mdc
This feature plan will detail the expected data, events and lifeCycle.

## 3. High-Level Goal

Implement a custom hook named "useHexMapViewState" that will handle all the top level stateful logic for the HexMapViewPage. The following core actions should be covered:

- loading the Map
- loading the MapItems of this Map
- selecting a tile on the Map (occupied or not)

## 4. Implementation

Guidance: should use `import { api } from "~/commons/trpc/react";`

1. Step 1: Loading the map

- expose a boolean lifecycle state const `mapIsLoading: boolean`
- expose a boolean lifecycle state const `mapLoadingError: string | null`
- expose a data state const `map: MapAPIContract`
- expose an event `refreshMap`
  Guidance: should use `api.map.getOne`

2. Step 2: Loading the mapItems

- expose a boolean lifecycle state const `mapItemsAreLoading: boolean`
- expose a boolean lifecycle state const `mapItemsLoadingError: string | null`
- expose a data state const array `mapItems: MapItemAPIContract[]`
  Guidance: should use `api.map.getItems`

3. Step 3: Selecting an HexTile

- expose a data state const `selection: { item: MapItem | null, coords: HexCoords }`
- expose an event `tileClick`
