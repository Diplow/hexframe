# Feature Plan: HexMap Interaction Flow

## 1. Problem Statement

Backend and state are ready to handle mapItems creation and deletion but we can not yet interact through a frontend interface. This feature is about exposing the state operations through a user interface.

## 2. Context

The page responsible to expose the interface for HexMap display and interaction is the /map/[id]/page.tsx. Pages are implemented by seggregating UI components and state components. The state part is already implemented and lives in src/app/map/[id]/state.ts. The items display is also implemented through the src/app/map/[id]/HexBoard. Last the tile are implemented in src/app/map/[id]/tile.tsx.

## 3. High-Level Goal

1. When clicking on a Tile in the HexBoard, display a focused view (e.g., a modal overlay) for that tile's coordinates. The rest of the board might be dimmed or hidden.
2. If the clicked tile coordinates correspond to an empty tile (no existing HexTileData), the focused view shows a form to create a new map item at those coordinates.
3. If the clicked tile coordinates correspond to an occupied tile (existing HexTileData), the focused view displays the item's details (title, description) and provides options to modify or delete the item.

## 4. Implementation

Guidance:

- Utilize the existing useHexMapViewState hook (src/app/map/[id]/state.ts) as the single source of truth for map state and interaction logic.
- Pass state and event handlers down as props from page.tsx to child components.

1. State Management (state.ts):

- Leverage the existing data.selection state. When selection is not null, it indicates a tile is selected, and the focused view should be shown.
- Modify the events.tileClick handler: It should set the data.selection to the clicked tile's coordinate string. Clicking the same tile again or a dedicated "Close" button in the focused view should set selection back to null.
- Implement an updateItem mutation using api.map.updateItem.useMutation (this TRPC endpoint needs to be created).
- Add an updateItem event handler to events that calls the new mutation.

2. Main Page (page.tsx):

- Conditionally render a new FocusedTileView component when data.selection is not null.
- Pass the following props to FocusedTileView:
  - coords: The data.selection string.
  - itemData: data.itemsById[data.selection] (will be undefined for empty tiles).
  - onClose: A function that calls events.setSelection(null).
  - onCreate: The events.createItem handler.
  - onUpdate: The new events.updateItem handler.
  - onDelete: The events.deleteItem handler.

3. Focused View Components (src/app/map/[id]/HexBoard/Tile/):

- Create FocusedTileView.tsx:
  - Acts as a modal or overlay container.
  - Receives props from page.tsx (coords, itemData, onClose, onCreate, onUpdate, onDelete).
  - Includes a "Close" button triggering onClose.
  - Conditionally renders either CreationForm.tsx (if itemData is undefined) or DisplayForm.tsx (if itemData exists).
- Create CreationForm.tsx:
  - A form with input fields (e.g., Title, Description).
  - On submit, calls the onCreate prop function with the form data and the coords. Include logic to close the view (onClose) after successful creation.
- Create DisplayForm.tsx:
  - Displays the itemData (Title, Description).
  - Includes an "Edit" button to toggle an editing state (e.g., making fields editable).
  - Includes a "Save" button (visible in edit mode) that calls the onUpdate prop function with the updated data and coords. Include logic to exit edit mode and potentially close the view (onClose) after saving.
  - Includes a "Delete" button that calls the onDelete prop function (ideally with a confirmation step). Include logic to close the view (onClose) after deletion.

4. Styling:

- Style FocusedTileView.tsx to appear as a modal overlay (e.g., centered, with a backdrop).
- Ensure forms are clearly laid out and usable.
