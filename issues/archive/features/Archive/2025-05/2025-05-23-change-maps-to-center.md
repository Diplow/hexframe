# Feature plan: Allow navigation to whatever MapItem

## Problem

Zooming deep on a map makes the navigation painful.

## Context

Read those files for a global understanding of the project architecture:

- README.md : a high level presentation of the project
- src/app/map/[id]/README.md : a presentation of the main page of the application and its structure

## High Level Goal

1. Display all the parent hierarchy on top of the map.
2. Add a button to navigate to a mapItem (i.e making it the center of the map)

## Detailed Implementation Plan

### Phase 1: Add Navigation Button on ItemTiles

**Goal**: Add a "Navigate to Center" button on each ItemTile that appears on hover and sets the clicked item as the new center.

#### 1.1 Create NavigationButton Component

- **File**: `src/app/map/[id]/Tile/navigation.button.static.tsx`
- **Function**: Create reusable button component for centering navigation
- **Props**:
  - `item: HexTileData`
  - `pathname: string`
  - `currentSearchParamsString: string`
  - `scale: TileScale`
- **Behavior**:
  - Hidden by default, visible on tile hover (using group-hover)
  - Updates URL with new `focus` parameter set to item's coordId
  - Clears `expandedItems` parameter to reset expansion state
  - Uses crosshairs or target icon from lucide-react
  - Positioned differently based on scale (like existing expand button)

#### 1.2 Update TileButtons Component

- **File**: `src/app/map/[id]/Tile/item.buttons.static.tsx`
- **Function**: `_createNavigationHref()`
  - Input: `(item: HexTileData, pathname: string, currentSearchParamsString: string) => string`
  - Logic: Create new URLSearchParams, set `focus` to item.metadata.coordId, clear `expandedItems`
- **Function**: `_getButtonPositioning()`
  - Input: `(scale: TileScale, buttonType: 'expand' | 'navigate') => string`
  - Logic: Calculate positioning classes for multiple buttons based on scale
- **Update**: Add NavigationButton alongside existing expand/collapse button
- **Layout**: Position buttons to avoid overlap (expand on top-left, navigate on top-right for scale ≥ 2)

#### 1.3 Update StaticItemTile Component

- **File**: `src/app/map/[id]/Tile/item.static.tsx`
- **Update**: Ensure group hover classes work for both buttons
- **Test**: Verify button visibility and positioning at different scales

### Phase 2: Create Parent Hierarchy Component

**Goal**: Display all parent items in a breadcrumb-like component at the top of the canvas.

#### 2.1 Create Utility Functions for Parent Hierarchy

- **File**: `src/app/map/[id]/State/hierarchy.utils.ts`
- **Function**: `_getParentHierarchy()`
  - Input: `(centerCoordId: string, items: Record<string, HexTileData>) => HexTileData[]`
  - Logic: Use `CoordSystem.getParentCoordFromId()` recursively to build parent chain
  - Return: Array of HexTileData from root to direct parent (excluding current center)
- **Function**: `_isUserMapCenter()`
  - Input: `(item: HexTileData) => boolean`
  - Logic: Check if item has no parent (path.length === 0)
- **Function**: `_shouldShowHierarchy()`
  - Input: `(hierarchy: HexTileData[]) => boolean`
  - Logic: Return false if center is UserMapItem (no parents), true otherwise

#### 2.2 Create HierarchyTile Component

- **File**: `src/app/map/[id]/Hierarchy/hierarchy-tile.static.tsx`
- **Function**: Render scale-1 ItemTile for hierarchy display
- **Props**:
  - `item: HexTileData`
  - `pathname: string`
  - `currentSearchParamsString: string`
  - `isLast: boolean` (for styling differences)
- **Behavior**:
  - Fixed scale of 1 regardless of map scale
  - Shows navigation button permanently (not just on hover)
  - No expand/collapse button
  - Simplified content (title only, truncated)

#### 2.3 Create ParentHierarchy Component

- **File**: `src/app/map/[id]/Hierarchy/parent-hierarchy.static.tsx`
- **Function**: Main component displaying parent chain
- **Props**:
  - `centerCoordId: string`
  - `items: Record<string, HexTileData>`
  - `pathname: string`
  - `currentSearchParamsString: string`
- **Layout**:
  - Horizontal flexbox container
  - Fixed position at top of canvas
  - Semi-transparent background
  - Arrow separators between items (using ChevronRight from lucide-react)
- **Behavior**:
  - Call `_getParentHierarchy()` to get parent chain
  - Render if `_shouldShowHierarchy()` returns true
  - Map through hierarchy with HierarchyTile components

#### 2.4 Update StaticMapCanvas

- **File**: `src/app/map/[id]/Canvas/index.static.tsx`
- **Update**: Add ParentHierarchy component above the HexRegion
- **Props**: Pass through required props (center, items, pathname, currentSearchParamsString)
- **Layout**: Position hierarchy at top of canvas container

### Phase 3: Styling and UX Improvements

#### 3.1 Enhanced Button Styling

- **File**: `src/app/map/[id]/Tile/navigation.button.static.tsx`
- **Styling**:
  - Distinct colors for expand vs navigate buttons
  - Smooth transitions and hover effects
  - Proper accessibility attributes (aria-label, role)
  - Keyboard navigation support

#### 3.2 Hierarchy Styling

- **File**: `src/app/map/[id]/Hierarchy/parent-hierarchy.static.tsx`
- **Styling**:
  - Responsive design for different screen sizes
  - Smooth scroll for long hierarchies
  - Gradient fade at edges
  - Consistent with existing design system

#### 3.3 Animation and Transitions

- **Files**: Both navigation button and hierarchy components
- **Enhancements**:
  - Smooth transitions when navigating
  - Loading states during navigation
  - Focus management for accessibility

### Phase 4: Testing and Documentation

#### 4.1 Create Storybook Stories

- **Files**:
  - `src/app/map/[id]/Tile/navigation.button.static.stories.tsx`
  - `src/app/map/[id]/Hierarchy/hierarchy-tile.static.stories.tsx`
  - `src/app/map/[id]/Hierarchy/parent-hierarchy.static.stories.tsx`
- **Coverage**: Test all scale variations, different hierarchy depths, edge cases

#### 4.2 Update README Documentation

- **File**: `src/app/map/[id]/README.md`
- **Additions**: Document new Hierarchy subdirectory and navigation functionality

#### 4.3 Integration Testing

- **Verification**:
  - Navigation works at all scales
  - Hierarchy updates correctly when center changes
  - No conflicts with existing expand/collapse functionality
  - Proper URL state management

### Technical Implementation Notes

#### URL Parameter Management

- **Focus Parameter**: Represents the current center coordinate ID
- **Navigation Logic**: Always clear `expandedItems` when changing center to avoid confusion
- **State Preservation**: Maintain `scale` parameter across navigation

#### Component Architecture Compliance

- **File Organization**: Follow existing pattern with subdirectories for related components
- **Naming Conventions**: Use `.static.tsx` suffix for static components
- **Props Pattern**: Match existing prop structure with `pathname` and `currentSearchParamsString`

#### Performance Considerations

- **Hierarchy Calculation**: Memoize parent hierarchy calculation to avoid recalculation on re-renders
- **Button Rendering**: Conditional rendering based on scale and hover state to minimize DOM impact
- **Accessibility**: Ensure proper focus management and keyboard navigation support

#### Error Handling

- **Missing Items**: Handle cases where parent items might not be loaded
- **Invalid Coordinates**: Graceful degradation when coordinate parsing fails
- **Empty Hierarchy**: Proper handling when no parents exist (UserMapItem center)
