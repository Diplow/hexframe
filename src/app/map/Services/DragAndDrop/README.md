# DragAndDrop Service Subsystem

## Mental Model
The DragAndDrop subsystem is like a "physical moving company" for hexagonal tiles - it handles the logistics of picking up, transporting, and placing tiles while following strict rules about what can go where. Unlike traditional React drag systems that rely on state updates, this operates like a direct physical manipulation system using pure DOM events and CSS visual feedback.

## Responsibilities
- DOM-based drag and drop operations using native events (no React state)
- Global coordination of drag operations across the entire map
- Ctrl key detection for operation type determination (copy vs move)
- Operation type tracking: default drag = copy, ctrl+drag = move
- Validation of drag operations based on business rules
- Registration and management of draggable tile elements
- Visual feedback through CSS classes during drag operations (blue for copy, existing for move)
- Composition-aware validation for tiles with negative direction children

## Non-Responsibilities
- Tile rendering → See `../../Canvas/README.md`
- Tile data management → See `../Cache/README.md`
- Business logic for tile relationships → See `lib/domains/mapping/README.md`
- Authentication checks → See `lib/domains/iam/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.

## Design Considerations

### Why GlobalDragService Avoids React State

The GlobalDragService is purposely designed to operate outside of React's state management system. This architectural decision provides several critical performance benefits:

**Prevents Canvas Re-renders During Drag Operations**
- Traditional React drag systems trigger state updates that cascade through the component tree
- In a hexagonal map with potentially hundreds of tiles, these re-renders can cause noticeable lag during drag operations
- By using pure DOM events and CSS classes, we achieve smooth 60fps dragging performance

**Direct DOM Manipulation for Visual Feedback**
- Uses CSS data attributes (`data-drag-active`, `data-drop-target`, `data-being-dragged`) for immediate visual feedback
- CSS transitions and animations run on the GPU compositor thread, independent of JavaScript execution
- No React reconciliation overhead for purely visual changes during drag operations

**Event Delegation Pattern**
- Single set of event listeners on the document level instead of individual tile listeners
- Reduces memory footprint and improves performance with large tile counts
- Automatic handling of dynamically added/removed tiles without re-registration

This approach trades some React integration convenience for significant performance gains, which is essential for smooth interaction with complex hexagonal maps.

### Copy vs Move Operations

The GlobalDragService supports two operation types controlled by the ctrl key:

**Copy Operation (Default)**
- Triggered by: Regular drag without ctrl key
- Behavior: Creates a deep copy of the source tile and its subtree
- Use case: Duplicating tiles to new locations
- Visual feedback: Blue highlight via `data-drop-operation="copy"` CSS attribute
- Backend: Routes to `copyMapItem` endpoint

**Move Operation (Ctrl+Drag)**
- Triggered by: Holding ctrl key during drag
- Behavior: Moves the source tile to the target location
- Use case: Reorganizing tiles without duplication
- Visual feedback: Existing highlight via `data-drop-operation="move"` CSS attribute
- Backend: Routes to `moveMapItem` endpoint

**Implementation Details**
- Ctrl key state tracked via `data-drag-operation-type` DOM attribute on document.body
- Operation type updates dynamically during dragover events (can switch mid-drag)
- Final operation type read from drop target element at drop time
- No React state involved - purely DOM-based tracking for performance

### Composition Support (Negative Directions)

The DragAndDrop service fully supports the composition model with negative directions:

**What is Composition?**
- Tiles can have "composed children" at negative direction positions (-1 through -6)
- These represent logical content that is "inside" or "part of" the parent tile
- Distinct from structural children (positive directions 1-6) which are "around" the tile

**Drag Operations with Composition**
- Parent tiles with composed children can be dragged normally
- Composed children themselves can be dragged independently
- Dropping on composed positions is validated same as structural positions
- All negative direction values (-1 through -6) are supported
- Mixed hierarchies (both structural and composed elements) work correctly

**Validation Rules**
- Ownership rules apply equally to composed and structural children
- Cannot drag composed children not owned by the user
- Can swap between composed children if user owns both
- Can move tiles between structural and composed positions
- Deep composition hierarchies (e.g., 1,0:2,3,-1,4) are supported

**Implementation**
- Uses CoordSystem utilities for coordinate parsing and validation
- Negative directions detected via `CoordSystem.isComposedChildId()`
- No special handling required - validation works uniformly across all direction types
- All drag validators transparently support negative directions