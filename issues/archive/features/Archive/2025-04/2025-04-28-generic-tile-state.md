# Feature plan: useGenericTileState hook

## Problem

There are a lot of tiles and they each instantiate their own state management which is a performance pitfall since for most of these tile the state could be generic and passed as props to the Tile component

## Context

## High Level Goals

## Detailed Implementation

1. Create a new file `src/app/map/[id]/Canvas/State/tile.ts` with the following implementation:

```typescript
import { useState } from "react";
import { HexCoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import { MapCanvasState } from "./index";
import { HexTileData } from "./types";
import { useDragAndDrop } from "../../Tile/State/dragandrop";

export interface TileStateProps {
  coords: string;
  state: MapCanvasState;
  item?: HexTileData;
}

export interface TileStyleProps {
  baseHexWidth: number;
  baseHexHeight: number;
  scale: number;
  effectiveSize: number;
  scaleSVG: { path: string; viewBox: string };
}

export interface TileState {
  // Visual properties
  isHovering: boolean;
  isSelected: boolean;
  fillColor: string;
  cursorStyle: string;

  // Dimensions and styling
  baseHexWidth: number;
  baseHexHeight: number;
  scale: number;
  scaleFactors: { width: number; height: number };
  effectiveSize: number;
  contentDisplayLevel: "minimal" | "medium" | "full";
  textSize: string;

  // Flags
  isCenter: boolean;
  isEmpty: boolean;

  // Event handlers
  handleTileClick: (coords: string, e: React.MouseEvent) => void;
  handleMouseEnter: (coords: string) => void;
  handleMouseLeave: (coords: string) => void;

  // Item operations
  handleCreate: (coords: string, data: { title?: string; descr?: string; url?: string }) => void;
  handleUpdate: (coords: string, data: { title?: string; descr?: string; url?: string }) => void;
  handleDelete: (coords: string) => void;

  // Drag and drop
  dragAndDrop: ReturnType<typeof useDragAndDrop>;

  // Configuration for child components
  layoutProps: {
    width: number;
    height: number;
    svgPath: string;
    svgViewBox: string;
    fillClass: string;
    strokeClass: string;
    cursorStyle: string;
    isSelected: boolean;
  };

  contentProps: {
    item?: HexTileData;
    textSize: string;
    displayLevel: "minimal" | "medium" | "full";
    isSelected: boolean;
    onUpdate: (data: { title?: string; descr?: string; url?: string }) => void;
    onCreate?: (data: { title?: string; descr?: string; url?: string }) => void;
    updateError?: string | null;
    createError?: string | null;
  };
}

2. Update the EmptyTile and ItemTile components to use this hook:
   - Replace inline state with the hook's return values
   - Use the computed properties for rendering

3. Refactor the drag and drop logic:
   - Update the useDragAndDrop hook to work with the new structure
   - Ensure it can be accessed through the generic tile state

4. Add performance optimizations:
   - Use useMemo for computed values
   - Add useCallback for event handlers
   - Use React.memo for component memoization

5. Update the Canvas state to use the generic state hook

## Benefits

1. **Performance Improvement**: By centralizing state management, we avoid redundant state calculations for each tile
2. **Cleaner Code**: Separation of concerns between state management and rendering
3. **Better Testability**: The hook can be tested independently from the UI components
4. **Easier Maintenance**: A single source of truth for tile behavior
5. **Consistent Behavior**: All tiles will behave identically because they share the same state logic
```
