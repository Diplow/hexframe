# Issue: Preview Panel for Tile Content

**Date**: 2025-01-07
**Status**: Open
**Tags**: #feature #design #tiles #high
**GitHub Issue**: #65
**Branch**: issue-3-preview-panel-tiles

## Problem Statement
We need a preview panel to read the content of the tiles. Then we can simplify the data display on tiles (just the title) and just display a markdown preview in the preview panel. We will later use this panel for more than just the preview but this is the start. The preview will take as much place as possible, while the toolbox, the map canvas and the hierarchy tiles will occupy the rest of the screen.

## User Impact
- Users cannot easily read tile content without clicking into each tile
- Current tile display may be cluttered with too much information
- No dedicated space for viewing detailed content while navigating the map
- Users need better separation between navigation (map) and content consumption (preview)

## Expected Behavior
1. Tiles show simplified display with just the title
2. Selecting a tile shows its content in a dedicated preview panel
3. Preview panel displays markdown content rendered properly
4. Preview panel takes as much screen space as possible
5. Toolbox, map canvas, and hierarchy tiles occupy the remaining screen space
6. Layout adjusts responsively to accommodate the preview panel

## Current Behavior
- Tiles display content directly on the tile surface
- No dedicated preview area for reading content
- Limited space on tiles for displaying full content

## Environment
- Component: Map view interface
- User role: All users navigating tile maps
- Frequency: Core feature - used constantly during map navigation

## Related Issues
- Previous tile display improvements
- Map canvas layout optimizations

## Solution

### Approach 1: Resizable Split Panel (Recommended)

**Implementation**: Create a vertical split layout with map on left, preview on right
- Add `PreviewPanel` component with markdown rendering
- Implement resizable splitter using CSS resize or react-resizable-panels
- Add preview state to MapCacheProvider for selected tile
- Modify main layout to use flexbox/grid split

**Components**:
- `/src/app/map/Preview/PreviewPanel.tsx` - New preview component
- `/src/app/map/page.tsx` - Update layout structure
- `/src/lib/domains/map/contexts/MapCacheContext.tsx` - Add preview state

**Pros**:
- Maximum preview space as requested
- Familiar split-pane UI pattern
- Both map and preview always visible
- Resizable for user preference

**Cons**:
- Reduces map canvas space
- Complex responsive behavior on mobile
- Requires layout restructuring

### Approach 2: Overlay Drawer Panel

**Implementation**: Floating panel that slides in from right
- Preview panel overlays map content
- Toggle button or tile selection opens panel
- Semi-transparent background option
- Fixed or percentage width

**Components**:
- `/src/app/map/Preview/PreviewDrawer.tsx` - Drawer component
- `/src/app/map/Controls/PreviewToggle.tsx` - Toggle button
- Minimal changes to existing layout

**Pros**:
- Preserves full map space when closed
- Easier mobile adaptation
- Less intrusive to current layout
- Smooth transition animations

**Cons**:
- Covers map content when open
- Not always visible
- Less screen real estate for preview

### Approach 3: Bottom Sheet Panel

**Implementation**: Slide-up panel from bottom of screen
- Adjustable height with drag handle
- Collapsible to show just title bar
- Map canvas adjusts height dynamically

**Components**:
- `/src/app/map/Preview/BottomSheet.tsx` - Sheet component
- Update canvas height calculations

**Pros**:
- Works well on mobile (familiar pattern)
- Adjustable preview size
- Map stays visible above

**Cons**:
- Less natural for desktop reading
- Horizontal space underutilized
- May feel cramped

### Recommended Solution: Approach 1 with Progressive Enhancement

**Phase 1**: Basic split panel
1. Add preview panel component with markdown rendering
2. Implement basic 60/40 split layout
3. Add tile selection state management
4. Simplify tile display to show only titles

**Phase 2**: Enhanced functionality
1. Add resizable splitter
2. Implement panel collapse/expand
3. Add preview panel toolbar (future features)
4. Optimize responsive behavior

**Phase 3**: Mobile optimization
1. Convert to overlay drawer on mobile
2. Add swipe gestures
3. Implement adaptive layout breakpoints

### Technical Details

**State Management**:
```typescript
// In MapCacheContext
interface PreviewState {
  selectedTileId: string | null;
  isPanelOpen: boolean;
  panelWidth: number;
}
```

**Layout Structure**:
```tsx
<div className="flex h-screen">
  <Toolbox />
  <div className="flex-1 flex">
    <MapCanvas className="flex-1" />
    <PreviewPanel className="w-[40%]" />
  </div>
  <ParentHierarchy />
</div>
```

**Tile Simplification**:
- Modify `DynamicTileContent` to show only title at all scales
- Remove description and URL from tile display
- Add visual indicator for selected tile

### Next Steps
1. Create PreviewPanel component structure
2. Implement selection state management
3. Update tile content display
4. Adjust layout components
5. Add responsive breakpoints