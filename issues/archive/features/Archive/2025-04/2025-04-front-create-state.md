# Feature Plan: HexMap Display and Interaction Flow

## 1. Problem Statement

One can see a map via the client but one can't yet add Items to a map nor remove them.

## 2. Context

The backend data management is exposed through a tRPC API defined in src/server/api/routers/map (exposed via src/server/api/root). The frontend application is a nextJS application using app router. The page responsible to expose the interface for HexMap display and interaction is the /map/[id] page. This feature is about implementing the state part for item creation and removal. The state part follow certain conventions defined in the rule front-local-state-management-hook.mdc, but you can also take inspiration from the rest of the state file.
This feature plan will detail new expected data, events and lifeCycle.

## 3. High-Level Goal

Modify the custom hook "useHexMapViewState" to add item creation and removal capabilities.

## 4. Implementation

Guidance: should use `import { api } from "~/commons/trpc/react";`

1. Step 1: Creating a new item for the map

- expose a boolean lifecycle state const `itemIsCreating: boolean`
- expose a boolean lifecycle state const `itemCreationError: string | null`
- expose an event `createItem`
  Guidance:
- should use `api.map.addItem`
- should be optimist about the item creation (creating it without waiting for the server response but handling errors)
- should add the item to the mapItems without needing any reload

2. Step 2: removing a mapItem

- expose a boolean lifecycle state const `itemIsRemoving: boolean`
- expose a boolean lifecycle state const `itemRemovingError: string | null`
- expose an event `deleteItem`
  Guidance:
- should use `api.map.remove`
- should be optimist about the item removal
- should remove the item to the mapItems without needing any reload
