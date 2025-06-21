# Refactor: Drag and Drop Hook Clarity

## Initial Section

**Target Code**: `/src/app/map/Canvas/hooks/useDragAndDrop.ts` (334 lines)

**Refactoring Goal**: Apply the Fundamental Rule and Rule of 6 to improve clarity and maintainability of the drag and drop hook.

**Current State Analysis**: 
- Single file with 334 lines containing complex drag and drop logic
- Multiple responsibilities mixed together (state management, event handling, UI calculations)
- Complex nested conditions and side effects
- Violates Rule of 6 with too many functions and responsibilities in one file

## Pre-Refactoring Analysis

### Existing Domain Concepts Found
From reading domain READMEs and existing code:
- `CoordSystem` from mapping domain for coordinate operations
- `TileData` and `MapItemType` from mapping objects
- `DragState` type already defined in `types.ts`
- Cache state management patterns from `Cache/State`

### New Concepts Identified
1. **DragCoordinateCalculator** - Handles all coordinate-related calculations during drag operations
   - Converting between screen positions and hex coordinates
   - Calculating offsets and positions
   
2. **DragStateManager** - Manages drag state transitions and validations
   - Handles state updates during drag lifecycle
   - Validates drop targets
   
3. **DragVisualEffects** - Manages visual feedback during drag operations
   - Ghost image creation
   - Hover effects and visual states
   
4. **DragEventHandlers** - Encapsulates browser drag event handling
   - Prevents default behaviors
   - Manages event data transfer

### Structural Issues
1. **File too long**: 334 lines (should be max ~50 for high-level orchestration)
2. **Too many responsibilities**: State management, calculations, visual effects, event handling
3. **Complex nested logic**: Deep nesting in event handlers makes flow hard to follow
4. **Mixed abstraction levels**: Low-level DOM manipulation mixed with high-level state management

### Proposed Changes
1. Split into multiple files following Rule of 6:
   - `useDragAndDrop.ts` - Main orchestration hook (max 50 lines)
   - `_state/` folder for state management
   - `_calculations/` folder for coordinate calculations
   - `_handlers/` folder for event handlers
   - `_visual/` folder for visual effects
   
2. Extract clear domain concepts with descriptive names
3. Ensure each function follows the Fundamental Rule
4. Group related functionality into logical modules

## User Validation

I'm about to refactor useDragAndDrop.ts.

From reading existing code and domain concepts, I'll use:
- From mapping domain:
  - `CoordSystem` for coordinate operations
  - `TileData` and `MapItemType` for tile data structures
- From app/map patterns:
  - Cache state management patterns
  - Existing `DragState` type from `types.ts`
  - `cacheSelectors` for data queries
  - `TileActionsContext` pattern from Canvas README

New concepts that might need definition:
1. **DragPermissionValidator** - Encapsulates ownership and draggability rules
   - Checks user ownership
   - Validates tile type (not root)
   - Returns boolean for drag permission

2. **DropTargetCalculator** - Determines valid drop locations
   - Finds empty sibling positions
   - Validates drop target compatibility
   - Returns array of valid coordinate IDs

3. **OptimisticMoveOrchestrator** - Manages optimistic updates and rollbacks
   - Captures rollback state
   - Updates tile and children coordinates
   - Handles API calls and rollback on failure

4. **DragEventCoordinator** - Thin wrapper for drag event handling
   - Sets data transfer properties
   - Prevents default behaviors
   - Manages drag state transitions

Should these new concepts be added to the codebase? Would you like me to proceed with this refactoring plan?

## Post-Refactoring Summary

### Changes Applied

1. **Structural Reorganization**:
   - Split 334-line file into focused modules
   - Created 4 subdirectories for different concerns
   - Main hook reduced to 122 lines (high-level orchestration)
   - Each module follows single responsibility principle

2. **New Module Structure**:
   ```
   hooks/
   ├── useDragAndDrop.ts (122 lines - orchestration)
   ├── _validators/
   │   ├── index.ts
   │   └── drag-permission.ts (23 lines)
   ├── _calculators/
   │   ├── index.ts  
   │   └── drop-targets.ts (47 lines)
   ├── _orchestrators/
   │   ├── index.ts
   │   └── optimistic-move.ts (167 lines - complex but low-level)
   └── _coordinators/
       ├── index.ts
       └── drag-events.ts (44 lines)
   ```

3. **Concepts Introduced**:
   - **canDragTile**: Clear permission validation
   - **getValidDropTargets/isValidDropTarget**: Drop target calculation
   - **performOptimisticMove**: Orchestrates the entire move operation
   - **Event coordinators**: Thin wrappers for drag event handling

4. **Clarity Improvements**:
   - Function names clearly express their purpose
   - Arguments show dependencies explicitly
   - Each function has a single, clear responsibility
   - Abstraction levels are consistent within each file

### Before/After Metrics
- **Before**: 1 file, 334 lines, mixed responsibilities
- **After**: 9 files, max 167 lines (low-level implementation), clear separation
- **Main hook**: Reduced from 334 to 122 lines
- **Cognitive load**: Significantly reduced through separation of concerns

### Future Considerations
1. The `optimistic-move.ts` file is 167 lines but acceptable as low-level implementation
2. Could further extract coordinate update logic if needed
3. Tests should be updated to test each module independently
4. Consider adding JSDoc comments for public APIs