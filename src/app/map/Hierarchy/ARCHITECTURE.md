# Hierarchy Component Architecture

## Overview

The Hierarchy component provides a vertical navigation control that displays the hierarchical path from the root tile to the current center tile. It serves as a breadcrumb-style navigation aid, allowing users to quickly navigate to parent tiles.

## Component Structure

### ParentHierarchy (`parent-hierarchy.tsx`)

The main component that renders the hierarchical navigation.

**Key Features**:
- Displays a vertical chain of tiles from root to current
- Each tile is clickable for navigation
- Shows user profile tile at the top
- Visual chevron indicators between tiles

### Components

#### UserProfileTile
- Shows the logged-in user's profile or "Guest"
- Navigates to user's personal map when clicked
- Uses the Logo component with username overlay
- Disabled state for guest users

#### DynamicHierarchyTile
- Renders individual tiles in the hierarchy
- Uses BaseTileLayout for consistent hexagonal appearance
- Scaled down size for compact display
- Hover and click interactions for navigation

#### HierarchyTileContent
- Content renderer for hierarchy tiles
- Truncates long names with ellipsis
- Depth-aware text coloring
- Tooltip for full name on hover

## Integration

The Hierarchy component integrates with:

### MapCache
- Uses `navigateToItem` for tile navigation
- Accesses `center` and `items` from cache state
- Falls back to props when cache is initializing

### Event Bus
- Navigation events are emitted through MapCache
- Other components react to navigation changes

### Authentication
- Shows user profile when authenticated
- Fetches user map data via tRPC
- Guest mode with limited functionality

## Utilities

### hierarchy.utils.ts
The `_getParentHierarchy` function builds the parent chain:
- Traverses from current tile to root
- Returns array in top-to-bottom order
- Handles missing parent references gracefully

## Styling

- Fixed width for consistent layout
- Vertical flex layout with gaps
- Transparent background
- Overflow handling for long hierarchies
- Responsive hover states

## Performance Considerations

- Uses render count tracking for debugging
- Memoization opportunities for hierarchy calculation
- Minimal re-renders through proper prop comparison

## Future Enhancements

- Collapsible sections for deep hierarchies
- Alternative compact view modes
- Keyboard navigation support
- Drag-to-reorder functionality