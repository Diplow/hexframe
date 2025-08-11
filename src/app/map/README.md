# Map Page (`src/app/map/`)

This directory contains the dynamic version of the hexagonal map application. The map is identified by a `center` query parameter. For a JavaScript-free version, use `/static/map`.

## Core Page Files

- **`page.tsx`**: The main entry point for the dynamic map page. It checks for the required `center` query parameter and renders the `DynamicMapPage` component.
- **`page.dynamic.tsx`**: The main dynamic map component that includes the MapCacheProvider, handles data fetching, and manages client-side state.
- **`layout.tsx`**: Provides the basic layout structure for the map page, typically ensuring it takes up the full screen and sets a background color.
- **`loading.tsx`**: A simple component displayed while the map data is being fetched.
- **`error.tsx`**: A client-side component that handles and displays errors that occur during data fetching or rendering of the map. It provides a "Retry" option.
- **`not-found.tsx`**: A component displayed if the requested map ID does not correspond to an existing map.
- **`constants.ts`**: Contains shared constants used across the map page, including color mappings and hierarchy tile sizing.

## Subdirectories

### `Canvas/`

This subdirectory holds components responsible for rendering the visual canvas of the map.

- **`index.dynamic.tsx`**: The dynamic version of the map canvas with caching and real-time updates.
- **`index.progressive.tsx`**: Progressive enhancement wrapper that adds dynamic features to static components.

### `Controls/`

Contains React components that provide user interaction controls for the map.

- **`index.tsx`**: Barrel file exporting all control components.
- **`ActionPanel.tsx`**: A UI panel allowing users to switch between different interaction modes (e.g., select, expand, edit, delete, lock). It manages its own state (collapsed, shortcuts, full) and updates the global interaction mode.
- **`mini-map.controller.tsx`**: Manages the behavior and state of the minimap. It tracks the main map's scroll position to update the minimap's viewport, handles toggling minimap visibility, and facilitates navigation by clicking on the minimap.
- **`scale.controller.tsx`**: A UI component that allows users to change the zoom level (scale) of the map. It updates the `scale` search parameter in the URL.

### `Dialogs/`

Houses components for displaying dialogs or modals to the user.

- **`confirmation.tsx`**: A generic confirmation dialog component used to ask the user for confirmation before performing an action (e.g., deleting an item).

### `State/`

Manages the client-side state for the interactive map canvas. This is primarily for the dynamic version of the map, but some types and utilities might be shared.

- **`index.ts`**: Exports the main hook `useMapCanvasState`, which consolidates various aspects of the map's state, including item data, selection, mutations, and interaction modes.
- **`init.ts`**: Contains the `useInit` hook, responsible for initializing and managing the `itemsById` state (a record of all map items).
- **`interactionMode.ts`**: Defines and manages the current `ActionMode` (e.g., `select`, `edit`, `delete`). It handles user clicks on tiles based on the active mode and persists the mode to `localStorage`.
- **`items.reducer.ts`**: A reducer function (`itemsReducer`) used to manage the state of map items (adding, updating, deleting, and changing expansion state).
- **`mutations.ts`**: Contains the `useMutations` hook, which handles client-side logic for creating, updating, deleting, and moving map items. It uses tRPC mutations to interact with the backend and includes optimistic updates.
- **`dragandrop.ts`**: Provides functions and configuration for handling drag-and-drop operations of map items, including creating custom drag images.
- **`types.ts`**: Defines core TypeScript types used across the map state, notably `HexTileData`, and includes an `adapt` function to transform API data into the client-side `HexTileData` format.

### `Tile/`

Components related to rendering individual hexagonal tiles on the map. Note: Static tile components have been moved to `/static/map/Tile/` but are still imported and used by the dynamic version.

- **Dynamic tiles**: Progressive versions that enhance static tiles with client-side interactivity

## Overall Flow (Dynamic Rendering)

1.  User navigates to `/map?center=[id]`.
2.  `page.tsx` checks for the required `center` query parameter.
3.  `page-content.tsx` fetches map data based on the center ID.
4.  URL search parameters (`scale`, `expandedItems`, `focus`) are parsed.
5.  `DynamicMapCanvas` is rendered within a `MapCacheProvider`.
6.  The map cache handles data loading, caching, and synchronization.
7.  Tiles are rendered with progressive enhancement for interactivity.
8.  User interactions (expand/collapse, navigation) update the cache state and optionally the URL.
