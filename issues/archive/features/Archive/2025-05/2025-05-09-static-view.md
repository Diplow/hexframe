# Refactor plan: migrating from client components only to server components mostly and client components where needed

## Problem

My current implementation mix statefull components and stateless components in a hard to understand way.

## Context

- Next15 application
- src/app/map/[id]/page.tsx -> server component that load mapData
- src/app/map/[id]/Canvas/
  - Region
- src/app/map/[id]/Tile/

  - Layouts
    - dimensions
    - shape
    - background
  - Item
    - content: title, description, url
    -
  - Empty

- src/app/map/[id]/Controls/
  - Context
  - Zoom
  - Tools

## High level Goals

1. Move some of the state in the URL (expanded items, interactionMode, baseHexSize)
2. Separate client components (for interacting with the map) and server components (to display the map)

## Implementation details

1. Simplify useMapCanvasState
   1.1. Create an intermediate level called CanvasContainer (at the end of this refactor it will simply become the MapCanvas component) that will contain the MapCanvas. The CanvasContainer will be a server component.
   1.2. Move the getItems logic from the useMapCanvasState to the CanvasContainer server component (you can get some inspiration from the map/[id]/page.tsx file that does the same kind of work). Pass the items to the existing child components since they are not in the canvasState anymore.
   1.3. Move the scale state (State/scale.ts) to the URL. Basically baseHexSize and the expandedItems list. DeepestLevel is just a helper to compute the scale of an item, you will probably need to refactor this logic.
   1.4. Move the interactionMode state to the URL.

Let's start with these steps and let me validate this before going further.
