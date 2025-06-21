# Enhanced Drag and Drop Feature

## Feature Request
Improve the drag and drop functionality to:
1. Allow moving tiles to any empty tile in the user space (not just siblings)
2. Handle swapping between two existing tiles in the user space (not necessarily siblings)

## Feature Understanding Phase

### Clarified Request
The current drag and drop system is limited to sibling tiles. We need to expand it to support:
- **Cross-hierarchy moves**: Moving tiles to empty positions anywhere in the user's tile space
- **Cross-hierarchy swaps**: Swapping any two tiles regardless of their relationship

### Problem Being Solved
Users are currently restricted in how they can reorganize their hexagonal maps. They can only rearrange tiles within the same parent frame, which limits the flexibility of spatial organization - a core principle of Hexframe's "context architecture" philosophy.

### Context Analysis

**Product Context**: 
- Hexframe is about visual composition and spatial meaning
- Users should be able to freely organize their tile hierarchies
- The hexagonal structure should support fluid reorganization

**Technical Context**:
- Current implementation uses a custom drag and drop hook
- The Canvas component manages tile interactions
- Tile positioning is based on parent-child relationships

### Alternative Approaches

1. **Approach 1: Direct DOM Manipulation**
   - Pros: Fast visual feedback, smooth animations
   - Cons: Complex state synchronization, potential inconsistencies

2. **Approach 2: Virtual Drop Zones**
   - Pros: Clear visual indicators, predictable behavior
   - Cons: Additional UI complexity, performance overhead

3. **Approach 3: State-Based Reorganization** (Preferred)
   - Pros: Clean separation of concerns, reliable state management, easier testing
   - Cons: Requires refactoring current implementation

### Assumptions
- Users expect intuitive drag feedback showing valid drop targets
- Swapping should be reversible (undo-friendly)
- Performance must remain smooth even with many tiles
- Empty tiles are visually distinguishable from occupied ones
- The operation should respect user permissions and tile ownership

### Core Requirements
- [ ] Detect all valid drop targets (empty tiles and swappable tiles)
- [ ] Provide visual feedback during drag operations
- [ ] Implement move-to-empty functionality
- [ ] Implement tile swapping functionality
- [ ] Maintain state consistency after operations
- [ ] Add appropriate animations/transitions

## Analysis Phase

### Architecture Review
Need to investigate:
- `/src/app/map/Canvas/` - Main canvas implementation
- Drag and drop hook implementation
- Tile state management
- Current sibling-only constraints

### Current State Analysis

The drag and drop system has a clean, modular architecture:
- **Canvas** component centrally manages drag state
- **useDragAndDrop** hook provides drag functionality with clear separation:
  - Validators: Permission checks
  - Calculators: Drop target identification
  - Orchestrators: State updates
  - Coordinators: Browser event handling

**Key Limitation**: The `getValidDropTargets` function in `drop-targets.ts` only searches for empty positions among siblings of the dragged tile. It uses:
```typescript
const siblingCoords = CoordSystem.getChildCoords(parentCoords);
```

### Impact Assessment

Changes needed:
1. **Drop Target Calculator**: Expand beyond siblings to all user tiles
2. **Swap Detection**: New logic to identify when dropping on occupied tiles
3. **State Updates**: Handle both move and swap operations
4. **Visual Feedback**: Show different indicators for move vs swap
5. **Permission Validation**: Ensure user owns both tiles in a swap

### Technical Constraints

- Must maintain optimistic update pattern for smooth UX
- Performance: Calculating all possible drop targets could be expensive with many tiles
- Coordinate system: Need to handle different hierarchy depths
- Cache consistency: Swapping requires updating multiple tiles atomically

## Design Phase

### Proposed Solution Approach

**Strategy**: Simplify the drag and drop logic by removing pre-calculation of valid targets.

1. **Universal Drop Target Approach**
   - Remove complex drop target calculation
   - Every user-owned tile (except root) is a valid drop target
   - Validate ownership and permissions on drag-over
   - Determine operation type (move/swap) based on target occupancy

2. **Simplified Validation**
   - On drag over: Check if tile is owned by user and not root
   - On drop: Check if target is empty (move) or occupied (swap)
   - No need to traverse or pre-calculate valid positions

3. **Visual Feedback System**
   - Empty tiles: Green highlight when hovered during drag
   - Occupied tiles: Blue highlight when hovered during drag
   - Invalid targets: No highlight (root tile, other users' tiles)

### Alternative Approaches Considered

1. **Unified Drop Target System**
   - Pros: Single code path, simpler logic
   - Cons: Harder to differentiate operations visually

2. **Mode-Based System (Move Mode vs Swap Mode)**
   - Pros: Clear user intent, simpler validation
   - Cons: Extra UI complexity, mode switching friction

### Architecture Decisions

- **Maintain existing hook structure**: Extend rather than rewrite
- **Performance optimization**: Use memoization for drop target calculations
- **State consistency**: Atomic updates for swap operations
- **Progressive enhancement**: Keep sibling dragging fast, add cross-hierarchy as enhancement

### Implementation Checklist

- [ ] **Phase 1: Simplify Drop Validation**
  - [ ] Remove/refactor `getValidDropTargets` to eliminate sibling-only logic
  - [ ] Update `isValidDropTarget` to check: user ownership, not root, not self
  - [ ] Remove any pre-calculation of valid targets
  
- [ ] **Phase 2: Add Operation Detection**
  - [ ] Update drop handlers to detect if target is empty (move) or occupied (swap)
  - [ ] Add visual feedback differentiation during hover
  - [ ] Ensure both operations use same validation logic
  
- [ ] **Phase 3: Implement Swap Operation**
  - [ ] Create `optimisticSwap` orchestrator
  - [ ] Handle coordinate updates for both tiles atomically
  - [ ] Update API to support swap operation
  
- [ ] **Phase 4: Visual Feedback**
  - [ ] Update Empty tile to show green highlight on valid hover
  - [ ] Update Item tile to show blue highlight on valid hover
  - [ ] Ensure smooth visual transitions
  
- [ ] **Phase 5: Testing & Polish**
  - [ ] Update existing tests to reflect new behavior
  - [ ] Add tests for cross-hierarchy moves and swaps
  - [ ] Test edge cases (self-drop, root drop attempts)
  - [ ] Verify performance with many tiles

### Test Strategy

**Happy Path Tests**:
1. Move tile to empty position in different parent
2. Swap two tiles in different parents
3. Visual feedback appears correctly

**Edge Cases**:
1. Attempt to swap tile with itself
2. Drag tile to its current position
3. Performance with 100+ tiles

## Progress Tracking
- [x] Create feature document
- [x] Analyze current implementation
- [x] Design solution
- [x] Get user approval
- [x] Implement changes
- [x] Test functionality
- [ ] Update documentation

## Implementation Status

### Completed
1. **Simplified Drop Validation** ✓
   - Removed sibling-only restriction
   - Any tile (except root and self) is now a valid drop target
   - Removed complex pre-calculation logic

2. **Operation Detection** ✓
   - Automatically detects move vs swap based on target occupancy
   - Added `getDropOperation` function to determine operation type
   - Visual feedback differentiates between operations

3. **Visual Feedback** ✓
   - Empty tiles show green highlight for move operations
   - Occupied tiles show blue filter effect for swap operations
   - Smooth transitions and clear user feedback

4. **Testing** ✓
   - Updated existing tests to reflect new behavior
   - Added comprehensive tests for enhanced functionality
   - All tests passing

### Pending
1. **Swap API Integration**
   - The swap orchestrator is implemented but not connected
   - Waiting for backend API to support swap operations
   - Currently logs swap attempts to console

## Next Steps
1. Connect swap orchestrator when API is available
2. Add E2E tests for the new functionality
3. Update user documentation