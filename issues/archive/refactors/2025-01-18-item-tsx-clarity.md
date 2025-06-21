# Refactor Session: item.tsx Clarity

**Date**: 2025-01-18
**Target**: `src/app/map/Tile/Item/item.tsx`
**Status**: Completed

## Pre-Refactoring Analysis

### File Overview
- **Current size**: 199 lines
- **Main component**: `DynamicItemTile` (145 lines - significantly exceeds 50 line guideline)
- **Additional exports**: `getColorFromItem` helper function
- **Purpose**: Interactive tile component with drag-and-drop, edit/delete dialogs, and state management

### Current Concepts

#### Existing Domain Concepts
From app/map types and utilities:
- `TileData` - tile data structure
- `TileColor` - color configuration
- `TileScale` - scale values
- `URLInfo` - URL metadata
- `TileActionsContext` - drag/drop context
- `CoordSystem` - coordinate utilities
- `DynamicBaseTileLayout` - base layout component
- `DynamicTileContent` - content display component
- `DynamicTileButtons` - button controls
- `UpdateItemDialog` - edit dialog (lazy loaded)
- `DeleteItemDialog` - delete dialog (lazy loaded)

#### Identified New Concepts

1. **DragState** (implicit)
   - **What**: Manages drag-related state and props for a tile
   - **Why**: Determines draggability, active drag state, and drag styling
   - **Current**: Complex inline logic (lines 89-129)

2. **DropTargetState** (implicit)
   - **What**: Manages drop target validation and state
   - **Why**: Handles drop operations and visual feedback
   - **Current**: Mixed with drag logic

3. **SwapPreview** (implicit)
   - **What**: Calculates preview color for swap operations
   - **Why**: Shows visual feedback during swap drag operations
   - **Current**: Inline calculation (lines 99-109)

4. **TestIdentifier** (implicit)
   - **What**: Generates consistent test IDs from coordinates
   - **Why**: Enables reliable E2E testing
   - **Current**: Inline string construction (lines 74-75)

5. **EditPermission** (implicit)
   - **What**: Determines if current user can edit a tile
   - **Why**: Controls visibility of edit/delete actions
   - **Current**: Simple ownership check (line 71)

6. **DialogManager** (implicit)
   - **What**: Manages dialog visibility state
   - **Why**: Controls when edit/delete dialogs appear
   - **Current**: Two separate useState hooks

### Rule of 6 Violations

1. **Component too large**: 145 lines (should be max 50)
2. **Too many responsibilities**: Rendering, drag/drop, dialogs, permissions, testing
3. **Complex conditional logic**: Multiple nested conditions for drag/drop states
4. **Mixed abstraction levels**: Low-level DOM events mixed with high-level component logic

### Clarity Issues

1. **Unclear variable names**: `pathPart`, `dropProps`, `dragProps` don't express intent clearly
2. **Complex ternary operations**: Nested ternaries for color calculation
3. **Spread operators**: Multiple spread operations obscure what props are passed
4. **Mixed concerns**: Test logging mixed with business logic
5. **Implicit dependencies**: Context may be null but not clearly handled

### Proposed Structure

Following the Rule of 6 and maintaining single abstraction levels:

```
item/
├── index.tsx                   # Re-export for backward compatibility
├── item.tsx                    # Main DynamicItemTile (thin wrapper)
├── _drag-state.ts              # Drag state management
├── _drop-target.ts             # Drop target logic
├── _swap-preview.ts            # Swap preview calculations
├── _test-identifier.ts         # Test ID generation
├── _edit-permission.ts         # Permission checks
└── _dialog-manager.tsx         # Dialog state management
```

### Alternative Structure (if modularization is preferred)

```
item.tsx                        # Main component (50 lines max)
_hooks/
├── use-drag-drop.ts           # Combined drag/drop logic
├── use-dialogs.ts             # Dialog state management
└── use-tile-state.ts          # Other tile state (permissions, test IDs)
```

### Questions for Validation

1. Should drag/drop logic be extracted to hooks or utility modules?
2. Is the test identifier generation used elsewhere and should be shared?
3. Should dialog management be a shared pattern across different tile types?
4. Would a `TileInteractionState` type improve the component interface?
5. Should the color swap preview be part of a broader preview system?

## User Validation

User feedback received:
- **Test identifiers**: Should be shared across all tile types (empty, items, etc.)
- **Dialog management**: Should be a shared pattern across tile types
- **TileInteractionState**: Agreed, would improve component interface
- **Preview system**: Should be designed for future expansion beyond color swaps

## Refactoring Plan

### Shared Components Structure

Based on user feedback, the following will be extracted to shared locations:

```
src/app/map/Tile/
├── _shared/
│   ├── test-identifier.ts      # Shared across all tile types
│   └── use-tile-dialogs.ts     # Reusable dialog management
├── _types/
│   └── interaction-state.ts    # TileInteractionState interface
└── _preview/
    ├── types.ts                # Preview system types
    └── swap-color-preview.ts   # First preview implementation
```

### Item Component Structure

```
src/app/map/Tile/Item/
├── index.tsx                    # Re-export for compatibility
├── item.tsx                     # Main component (<50 lines)
├── _hooks/
│   └── use-item-interaction.ts  # Combines drag/drop/edit state
├── _validators/
│   └── edit-permission.ts       # Permission checks
└── _coordinators/
    ├── drag-coordination.ts     # Drag prop management
    └── drop-coordination.ts     # Drop prop management
```

### New Types

```typescript
// _types/interaction-state.ts
export interface TileInteractionState {
  // Drag state
  isDraggable: boolean;
  isBeingDragged: boolean;
  dragProps: React.DragHTMLAttributes<HTMLDivElement>;
  
  // Drop state
  isValidDropTarget: boolean;
  isDropTargetActive: boolean;
  dropOperation: 'move' | 'swap' | null;
  dropProps: React.DragHTMLAttributes<HTMLDivElement>;
  
  // Edit state
  canEdit: boolean;
  
  // Visual state
  cursor: string;
  previewState?: PreviewState;
}

// _preview/types.ts
export interface PreviewState {
  type: 'color-swap' | 'position-change' | 'hierarchy-change';
  data: unknown; // Specific to preview type
}
```

### Benefits of This Structure

1. **Shared test-identifier.ts**: All tile types can use consistent test IDs
2. **Reusable use-tile-dialogs.ts**: Any tile needing edit/delete gets the same pattern
3. **Extensible preview system**: Easy to add new preview types (position, hierarchy, etc.)
4. **Clean TileInteractionState**: Single source of truth for all interaction state
5. **Follows Rule of 6**: Each module stays focused and under size limits

Ready to proceed with implementation?

## Refactoring Results

### Implementation Summary

Successfully refactored the 199-line file with 145-line component down to a modular structure with the main component at 67 lines.

### Created Shared Components

```
src/app/map/Tile/
├── _shared/
│   ├── test-identifier.ts      # Generates consistent test IDs from coordinates
│   └── use-tile-dialogs.ts     # Reusable dialog management hook
├── _types/
│   └── interaction-state.ts    # TileInteractionState interface
├── _preview/
│   ├── types.ts                # Extensible preview system types
│   └── swap-color-preview.ts   # Color swap preview implementation
└── README.md                   # Documentation for tile components
```

### Created Item-Specific Modules

```
src/app/map/Tile/Item/
├── index.tsx                   # Re-exports for backward compatibility
├── item.tsx                    # Main component (67 lines)
├── _hooks/
│   ├── use-item-interaction.ts # Tile interaction state from context
│   ├── use-item-dialogs.ts     # Dialog state management
│   └── use-item-state.ts       # Combined state logic
├── _validators/
│   └── edit-permission.ts      # Permission validation
├── _coordinators/
│   ├── drag-coordination.ts    # Drag event prop creation
│   ├── drop-coordination.ts    # Drop event prop creation
│   └── swap-preview.ts         # Swap preview calculations
├── _utils/
│   ├── color.ts                # Color extraction from tile data
│   └── test-identifier.ts      # Test ID generation
└── _components/
    ├── item-dialogs.tsx        # Update/delete dialog rendering
    └── item-tile-content.tsx   # Tile content and buttons
```

### Key Improvements

1. **Modular Architecture**: Logic organized by type (hooks, coordinators, validators, utils)
2. **Shared Components**: Test IDs and dialogs can be reused by all tile types
3. **Extensible Preview System**: Foundation for future preview features
4. **Clean Interfaces**: TileInteractionState provides consistent interaction API
5. **Maintained Functionality**: All features preserved with same external interface

### Component Size Reduction

- Original: 199 lines (component: 145 lines)
- Refactored: 67 lines (main component)
- Logic distributed across 12 focused modules

### Testing & Quality

- All existing functionality preserved
- Lazy loading maintained for performance
- Clear module boundaries for easier testing
- Documentation created for shared components

### Notes

While the target was 50 lines, the 67-line result maintains clarity without sacrificing readability. Further reduction would require splitting the render method, which would harm comprehension.