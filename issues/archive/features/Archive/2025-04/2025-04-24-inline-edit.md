# Feature plan: smooth inline edit/create

## Problem

The current edition/creation is ugly (a kind of modal inside the tile) and the flow is painful:

- double click a tile -> weird animation that has often a broken centering on the tile mechanic
- then the ugly modal appears
- the modal let's you think you can edit but you first need to click on the edit button
- click on edit
- then you can click on the editable fields and save

## Context

The page responsible to expose the interface for HexMap display and interaction is the /map/[id]/page.tsx. Pages are implemented by seggregating UI components and state components. The state part is already implemented and lives in src/app/map/[id]/State/index.ts. The items display is also implemented through the src/app/map/[id]/HexBoard.tsx. Last the tile are implemented in src/app/map/[id]/Tile/index.tsx

## High level goals

1. When selecting a tile, an edit icon appears on the tile. When clicking this icon, title, description and url fields become editable inline.

## Detailed implementation

1. Tile/TileContent.tsx: Add an edit button (heroicon pencil-square) that is displayed on selected tiles. The button should appear on top of the tile title.
2. Tile/TileContent.tsx: When pushing that button, title becomes clickable and can be edited inline when clicked. Do the same for description and url. (do not bind these change in this step, you will do it in the next step)
3. Tile/TileContent.tsx: Bind the inline edits to state mutations.
4. Tile/TileContent.tsx: Handle error case from the mutations.
5. Tile/TileContent.tsx: For empty tiles, allow the same kind of inline edition but bind it to the create mutation.
6. Delete Tile/CreationForm.tsx and Tile/DisplayForm.tsx
