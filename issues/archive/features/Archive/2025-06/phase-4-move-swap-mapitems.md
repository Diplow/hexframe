# Phase 4: Move and Swap MapItems

## Overview

Implement drag-and-drop functionality and swap operations for mapItems. This includes visual feedback during drag operations, drop zones, and handling both move and swap scenarios with proper validation and error handling.

## New Components to Create

### 1. DragPreview Component

**File:** `src/app/map/[id]/Tile/Item/drag-preview.tsx`

```typescript
interface DragPreviewProps {
  item: HexTileData;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
}

export function DragPreview({ item, isDragging, dragOffset }: DragPreviewProps) {
  if (!isDragging) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 opacity-80"
      style={{
        left: dragOffset.x - 25,
        top: dragOffset.y - 25,
        transform: 'rotate(5deg)',
      }}
    >
      <StaticBaseTileLayout
        coordId={item.metadata.coordId}
        color={getColorFromItem(item)}
        stroke={{ color: "zinc-950", width: 2 }}
        cursor="cursor-grabbing"
      >
        <div className="flex items-center justify-center text-xs font-bold">
          {item.data.name}
        </div>
      </StaticBaseTileLayout>
    </div>
  );
}
```

### 2. DropZone Component

**File:** `src/app/map/[id]/Tile/Base/drop-zone.tsx`

```typescript
interface DropZoneProps {
  coordId: string;
  isValidDropTarget: boolean;
  isDragOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (sourceCoordId: string) => void;
  children: ReactNode;
}

export function DropZone({
  coordId,
  isValidDropTarget,
  isDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  children,
}: DropZoneProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isValidDropTarget) {
      e.dataTransfer.dropEffect = "move";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceCoordId = e.dataTransfer.getData("text/plain");
    if (isValidDropTarget && sourceCoordId) {
      onDrop(sourceCoordId);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative",
        isDragOver && isValidDropTarget && "ring-2 ring-blue-400 ring-opacity-75",
        isDragOver && !isValidDropTarget && "ring-2 ring-red-400 ring-opacity-75"
      )}
    >
      {children}
      {isDragOver && (
        <DropZoneOverlay isValidTarget={isValidDropTarget} />
      )}
    </div>
  );
}

interface DropZoneOverlayProps {
  isValidTarget: boolean;
}

function DropZoneOverlay({ isValidTarget }: DropZoneOverlayProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <div
        className={cn(
          "rounded-full p-2",
          isValidTarget ? "bg-blue-500 text-white" : "bg-red-500 text-white"
        )}
      >
        {isValidTarget ? (
          <ArrowDownCircle size={24} />
        ) : (
          <XCircle size={24} />
        )}
      </div>
    </div>
  );
}
```

### 3. DraggableItemTile Component

**File:** `src/app/map/[id]/Tile/Item/draggable-item.tsx`

```typescript
interface DraggableItemTileProps {
  item: HexTileData;
  allExpandedItemIds: string[];
  hasChildren: boolean;
  isCenter?: boolean;
  urlInfo: URLInfo;
  isDragMode?: boolean;
  onDragStart?: (item: HexTileData) => void;
  onDragEnd?: () => void;
}

export function DraggableItemTile({
  item,
  allExpandedItemIds,
  hasChildren,
  isCenter = false,
  urlInfo,
  isDragMode = false,
  onDragStart,
  onDragEnd,
}: DraggableItemTileProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDragMode) {
      e.preventDefault();
      return;
    }

    setIsDragging(true);
    e.dataTransfer.setData("text/plain", item.metadata.coordId);
    e.dataTransfer.effectAllowed = "move";

    // Create custom drag image
    const dragImage = createDragImage(item);
    e.dataTransfer.setDragImage(dragImage, 25, 25);

    onDragStart?.(item);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  return (
    <div
      draggable={isDragMode && !isCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "group relative hover:z-10",
        isDragMode && !isCenter && "cursor-grab",
        isDragging && "opacity-50"
      )}
    >
      <StaticItemTile
        item={item}
        allExpandedItemIds={allExpandedItemIds}
        hasChildren={hasChildren}
        isCenter={isCenter}
        urlInfo={urlInfo}
      />

      {isDragMode && !isCenter && (
        <DragHandle />
      )}
    </div>
  );
}

function DragHandle() {
  return (
    <div className="absolute right-1 top-1 z-20 opacity-0 group-hover:opacity-100">
      <div className="rounded bg-gray-800 p-1 text-white shadow-lg">
        <GripVertical size={12} />
      </div>
    </div>
  );
}
```

### 4. MoveConfirmationDialog Component

**File:** `src/app/map/[id]/Dialogs/move-confirmation.dialog.tsx`

```typescript
interface MoveConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sourceItem: HexTileData;
  targetCoordId: string;
  targetItem?: HexTileData;
  moveType: "move" | "swap";
}

export function MoveConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  sourceItem,
  targetCoordId,
  targetItem,
  moveType,
}: MoveConfirmationDialogProps) {
  const getMoveDescription = () => {
    if (moveType === "swap" && targetItem) {
      return (
        <div className="space-y-2">
          <p>This will swap the positions of:</p>
          <div className="rounded bg-gray-50 p-3">
            <div className="font-medium">"{sourceItem.data.name}"</div>
            <div className="text-sm text-gray-600">
              Currently at {sourceItem.metadata.coordId}
            </div>
          </div>
          <div className="text-center">⇅</div>
          <div className="rounded bg-gray-50 p-3">
            <div className="font-medium">"{targetItem.data.name}"</div>
            <div className="text-sm text-gray-600">
              Currently at {targetItem.metadata.coordId}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-2">
          <p>This will move:</p>
          <div className="rounded bg-gray-50 p-3">
            <div className="font-medium">"{sourceItem.data.name}"</div>
            <div className="text-sm text-gray-600">
              From {sourceItem.metadata.coordId} to {targetCoordId}
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Confirm {moveType === "swap" ? "Swap" : "Move"}
          </DialogTitle>
          <DialogDescription>
            {getMoveDescription()}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            {moveType === "swap" ? "Swap Items" : "Move Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Drag and Drop Manager Hook

**File:** `src/app/map/[id]/State/drag-drop-manager.ts`

```typescript
interface DragDropState {
  isDragging: boolean;
  draggedItem: HexTileData | null;
  draggedCoordId: string | null;
  validDropTargets: Set<string>;
  hoveredDropTarget: string | null;
}

export function useDragDropManager(
  mapItems: Record<string, HexTileData>,
  moveItem: (sourceCoord: string, targetCoord: string) => void,
) {
  const [state, setState] = useState<DragDropState>({
    isDragging: false,
    draggedItem: null,
    draggedCoordId: null,
    validDropTargets: new Set(),
    hoveredDropTarget: null,
  });

  const startDrag = useCallback(
    (item: HexTileData) => {
      const validTargets = calculateValidDropTargets(item, mapItems);

      setState({
        isDragging: true,
        draggedItem: item,
        draggedCoordId: item.metadata.coordId,
        validDropTargets: new Set(validTargets),
        hoveredDropTarget: null,
      });
    },
    [mapItems],
  );

  const endDrag = useCallback(() => {
    setState({
      isDragging: false,
      draggedItem: null,
      draggedCoordId: null,
      validDropTargets: new Set(),
      hoveredDropTarget: null,
    });
  }, []);

  const setHoveredTarget = useCallback((coordId: string | null) => {
    setState((prev) => ({
      ...prev,
      hoveredDropTarget: coordId,
    }));
  }, []);

  const handleDrop = useCallback(
    (targetCoordId: string) => {
      if (!state.draggedCoordId || !state.validDropTargets.has(targetCoordId)) {
        return;
      }

      moveItem(state.draggedCoordId, targetCoordId);
      endDrag();
    },
    [state.draggedCoordId, state.validDropTargets, moveItem, endDrag],
  );

  const isValidDropTarget = useCallback(
    (coordId: string) => {
      return state.validDropTargets.has(coordId);
    },
    [state.validDropTargets],
  );

  const isDragOver = useCallback(
    (coordId: string) => {
      return state.hoveredDropTarget === coordId;
    },
    [state.hoveredDropTarget],
  );

  return {
    state,
    startDrag,
    endDrag,
    setHoveredTarget,
    handleDrop,
    isValidDropTarget,
    isDragOver,
  };
}

function calculateValidDropTargets(
  draggedItem: HexTileData,
  mapItems: Record<string, HexTileData>,
): string[] {
  const validTargets: string[] = [];
  const draggedCoords = draggedItem.metadata.coordinates;

  // Get all possible coordinates at the same level
  const parentCoordId = CoordSystem.getParentCoordFromId(
    draggedItem.metadata.coordId,
  );
  if (parentCoordId) {
    const siblingCoords = CoordSystem.getChildCoordsFromId(parentCoordId);
    validTargets.push(...siblingCoords);
  }

  // Remove the dragged item's current position
  return validTargets.filter((coord) => coord !== draggedItem.metadata.coordId);
}
```

## Files to Modify

### 1. Update StaticHexRegion for Drag and Drop

**File:** `src/app/map/[id]/Canvas/hex-region.static.tsx`

```typescript
// Add drag and drop support to RenderChild
const RenderChild = ({
  coords,
  mapItems,
  expandedItemIds,
  urlInfo,
}: RenderChildProps) => {
  const item = mapItems[coords];
  const { data: interactionData } = useInteractionMode(/* ... */);
  const dragDropManager = useDragDropManager(mapItems, /* moveItem callback */);

  const isDragMode = interactionData.interactionMode === "move";

  if (!item) {
    return (
      <DropZone
        coordId={coords}
        isValidDropTarget={dragDropManager.isValidDropTarget(coords)}
        isDragOver={dragDropManager.isDragOver(coords)}
        onDragEnter={() => dragDropManager.setHoveredTarget(coords)}
        onDragLeave={() => dragDropManager.setHoveredTarget(null)}
        onDrop={dragDropManager.handleDrop}
      >
        <EmptyTile coordId={coords} />
      </DropZone>
    );
  }

  if (isExpanded) {
    return (
      <DropZone
        coordId={coords}
        isValidDropTarget={dragDropManager.isValidDropTarget(coords)}
        isDragOver={dragDropManager.isDragOver(coords)}
        onDragEnter={() => dragDropManager.setHoveredTarget(coords)}
        onDragLeave={() => dragDropManager.setHoveredTarget(null)}
        onDrop={dragDropManager.handleDrop}
      >
        <StaticHexRegion
          center={coords}
          mapItems={mapItems}
          expandedItemIds={expandedItemIds}
          urlInfo={urlInfo}
        />
      </DropZone>
    );
  }

  return (
    <DropZone
      coordId={coords}
      isValidDropTarget={dragDropManager.isValidDropTarget(coords)}
      isDragOver={dragDropManager.isDragOver(coords)}
      onDragEnter={() => dragDropManager.setHoveredTarget(coords)}
      onDragLeave={() => dragDropManager.setHoveredTarget(null)}
      onDrop={dragDropManager.handleDrop}
    >
      <DraggableItemTile
        item={item}
        allExpandedItemIds={expandedItemIds}
        hasChildren={itemHasChildren}
        isCenter={false}
        urlInfo={urlInfo}
        isDragMode={isDragMode}
        onDragStart={dragDropManager.startDrag}
        onDragEnd={dragDropManager.endDrag}
      />
    </DropZone>
  );
};
```

### 2. Add Move Mode to ActionPanel

**File:** `src/app/map/[id]/Controls/ActionPanel.tsx`

```typescript
// Add to actions array
{
  mode: "move",
  label: "Move/Swap",
  shortcut: "M",
  icon: <Move className="h-5 w-5" />,
  description: "Drag and drop tiles to move or swap their positions",
  cursor: "grab",
},
```

### 3. Update InteractionMode Types

**File:** `src/app/map/[id]/State/interactionMode.ts`

```typescript
// Add to ActionMode type
export type ActionMode =
  | "select"
  | "expand"
  | "deepExpand"
  | "edit"
  | "delete"
  | "move" // Add this
  | "lock";

// Add move mode handling
const handleTileClick = (coord: string) => {
  const currentMode = interactionMode;

  switch (currentMode) {
    // ... existing cases
    case "move":
      // Move mode is handled by drag and drop, not clicks
      break;
    // ... other cases
  }
};
```

### 4. Enhance Mutations Hook for Move Operations

**File:** `src/app/map/[id]/State/mutations.ts`

```typescript
// Add move confirmation state
const [moveConfirmation, setMoveConfirmation] = useState<{
  isOpen: boolean;
  sourceItem: HexTileData | null;
  targetCoordId: string | null;
  targetItem: HexTileData | null;
  moveType: "move" | "swap";
} | null>(null);

// Enhanced moveItem with confirmation
const moveItemWithConfirmation = useCallback(
  (sourceCoord: string, targetCoord: string) => {
    const sourceItem = itemsById[sourceCoord];
    const targetItem = itemsById[targetCoord];

    if (!sourceItem) return;

    const moveType = targetItem ? "swap" : "move";

    setMoveConfirmation({
      isOpen: true,
      sourceItem,
      targetCoordId: targetCoord,
      targetItem,
      moveType,
    });
  },
  [itemsById],
);

const confirmMove = useCallback(() => {
  if (!moveConfirmation?.sourceItem) return;

  moveItem({
    sourceCoord: moveConfirmation.sourceItem.metadata.coordId,
    targetCoord: moveConfirmation.targetCoordId!,
  });

  setMoveConfirmation(null);
}, [moveConfirmation, moveItem]);

const cancelMove = useCallback(() => {
  setMoveConfirmation(null);
}, []);
```

### 5. Create Drag Image Utility

**File:** `src/app/map/[id]/State/drag-image.utils.ts`

```typescript
export function createDragImage(item: HexTileData): HTMLElement {
  const dragImage = document.createElement("div");
  dragImage.className = "drag-image";

  // Create SVG hexagon
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "50");
  svg.setAttribute("height", "58");
  svg.setAttribute("viewBox", "0 0 100 115.47");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M50 0 L100 28.87 L100 86.6 L50 115.47 L0 86.6 L0 28.87Z",
  );
  path.setAttribute("fill", "#e5e7eb");
  path.setAttribute("stroke", "#374151");
  path.setAttribute("stroke-width", "2");

  svg.appendChild(path);

  // Add text
  const text = document.createElement("div");
  text.textContent = item.data.name.substring(0, 10);
  text.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 8px;
    font-weight: bold;
    color: #374151;
    text-align: center;
    pointer-events: none;
  `;

  dragImage.style.cssText = `
    position: absolute;
    top: -1000px;
    left: -1000px;
    width: 50px;
    height: 58px;
    opacity: 0.8;
    transform: rotate(5deg);
    pointer-events: none;
  `;

  dragImage.appendChild(svg);
  dragImage.appendChild(text);
  document.body.appendChild(dragImage);

  // Clean up after a short delay
  setTimeout(() => {
    if (document.body.contains(dragImage)) {
      document.body.removeChild(dragImage);
    }
  }, 100);

  return dragImage;
}
```

## Integration Points

### 1. Update Main Canvas for Global Drag State

**File:** `src/app/map/[id]/Canvas/index.static.tsx`

```typescript
export const StaticMapCanvas = ({
  centerInfo,
  items,
  expandedItemIds,
  urlInfo,
  children,
}: StaticMapCanvasProps) => {
  const { dialogState, openMoveConfirmation, closeMoveConfirmation } = useDialogManager();

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="pointer-events-auto grid flex-grow place-items-center overflow-auto p-4">
        {/* ... existing content */}

        {/* Move confirmation dialog */}
        <MoveConfirmationDialog
          isOpen={dialogState.moveConfirmation.isOpen}
          onClose={closeMoveConfirmation}
          onConfirm={confirmMove}
          sourceItem={dialogState.moveConfirmation.sourceItem}
          targetCoordId={dialogState.moveConfirmation.targetCoordId}
          targetItem={dialogState.moveConfirmation.targetItem}
          moveType={dialogState.moveConfirmation.moveType}
        />
      </div>
    </div>
  );
};
```

### 2. Update Tile Exports

**File:** `src/app/map/[id]/Tile/index.ts`

```typescript
// Add new exports
export { DraggableItemTile } from "./Item/draggable-item";
export { DropZone } from "./Base/drop-zone";
export { DragPreview } from "./Item/drag-preview";
export type { DraggableItemTileProps } from "./Item/draggable-item";
export type { DropZoneProps } from "./Base/drop-zone";
```

## Testing Strategy

### 1. Unit Tests

**File:** `src/app/map/[id]/State/__tests__/drag-drop-manager.test.tsx`

```typescript
describe("DragDropManager", () => {
  test("should calculate valid drop targets", () => {});
  test("should handle drag start/end", () => {});
  test("should validate drop operations", () => {});
  test("should handle hover states", () => {});
});
```

### 2. Integration Tests

**File:** `src/app/map/[id]/__tests__/move-flow.test.tsx`

```typescript
describe("Move and Swap Flow", () => {
  test("should enable drag mode when move action selected", () => {});
  test("should show valid drop targets during drag", () => {});
  test("should confirm move operations", () => {});
  test("should handle swap operations", () => {});
  test("should prevent invalid moves", () => {});
});
```

## Implementation Order

1. **Create Drag and Drop Components:**

   - DragPreview component
   - DropZone component
   - DraggableItemTile component

2. **Create Drag and Drop Manager:**

   - useDragDropManager hook
   - Drag image utilities
   - Valid target calculation

3. **Add Move Confirmation:**

   - MoveConfirmationDialog component
   - Confirmation state management

4. **Update Canvas Integration:**

   - Modify StaticHexRegion for drag/drop
   - Add global drag state management

5. **Update Interaction System:**

   - Add move mode to ActionPanel
   - Update interaction mode handling

6. **Testing:**

   - Unit tests for drag/drop logic
   - Integration tests for move flow
   - E2E tests for user interactions

7. **Polish and UX:**
   - Visual feedback improvements
   - Accessibility enhancements
   - Performance optimizations

## UX Considerations

1. **Visual Feedback:**

   - Clear drag handles on hover
   - Visual indication of valid drop targets
   - Smooth drag preview with rotation effect
   - Color-coded drop zones (green for valid, red for invalid)

2. **Accessibility:**

   - Keyboard alternatives for drag and drop
   - Screen reader announcements for drag operations
   - Focus management during drag operations

3. **Error Prevention:**

   - Clear validation of move operations
   - Confirmation dialogs for destructive actions
   - Visual feedback for invalid operations

4. **Performance:**
   - Efficient drop target calculation
   - Minimal re-renders during drag operations
   - Optimized drag image creation

## Notes

- This phase introduces complex interaction patterns while maintaining usability
- The drag and drop system is designed to be extensible for future features
- Move confirmation prevents accidental operations
- The system handles both simple moves and complex swaps
- Integration with existing mutation system ensures data consistency
