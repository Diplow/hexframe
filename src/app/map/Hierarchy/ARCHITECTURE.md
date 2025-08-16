# Architecture: Hierarchy

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
Hierarchy/
├── interface.ts       # Public API
├── dependencies.json  # Allowed imports
├── index.tsx         # Exports aggregation
└── parent-hierarchy.tsx  # Main hierarchy component with user profile
```

## Key Patterns
- **Component Composition**: UserProfileTile and DynamicHierarchyTile composed within ParentHierarchy
- **Cache Integration**: Uses useMapCache hook for hierarchy data, navigation, and tile access
- **Render Tracking**: Debug logging for render performance monitoring
- **Data Delegation**: Hierarchy calculation delegated to Cache subsystem

## Components

### ParentHierarchy
Main component that renders the hierarchical navigation:
- Displays vertical chain of tiles from root to current
- Shows user profile tile at the top
- Visual chevron indicators between tiles
- Gets hierarchy data from Cache via useMapCache hook

### UserProfileTile
User profile display and navigation:
- Shows logged-in user's profile or "Guest"
- Navigates to user's personal map when clicked
- Uses Logo component with username overlay
- Fetches user map data via tRPC API
- Loading state during navigation

### DynamicHierarchyTile
Individual tile rendering in hierarchy:
- Uses BaseTileLayout for consistent hexagonal appearance
- Scaled down size for compact display (HIERARCHY_TILE_SCALE)
- Click handler for navigation via MapCache

### HierarchyTileContent
Content renderer for hierarchy tiles:
- Truncates long names with CSS line clamping
- Depth-aware text coloring via getTextColorForDepth
- Title attribute for full name on hover

## Data Management

Hierarchy traversal and data operations are handled by the Cache subsystem:
- Parent hierarchy calculation via `getParentHierarchy()`
- Center item retrieval via `getCenterItem()`
- All hierarchy logic centralized in Cache's hierarchy service

## Dependencies

| Dependency | Purpose |
|------------|---------|
| ~/app/map/Cache/interface | Navigation and tile data access |
| ~/app/map/Canvas/interface | BaseTileLayout for rendering tiles |
| ~/lib/domains/mapping/utils/hex-coordinates | Parent coordinate calculation |
| ~/contexts/UnifiedAuthContext | User authentication state |
| ~/commons/trpc/react | User map data fetching |
| ~/app/map/types/* | Type definitions and theme colors |
| ~/app/map/constants | Size and scale constants |
| ~/lib/debug/debug-logger | Debug logging |
| ~/components/ui/logo | Logo component for user tile |
| lucide-react | Icon components (ChevronDown, Loader2) |
| react | React hooks and state management |

## Interactions

### Inbound (Who uses this subsystem)
- **Map Page Layout** → Uses ParentHierarchy component to display hierarchy

### Outbound (What this subsystem uses)
- **Cache** ← For navigation operations and tile data
- **Canvas** ← For tile rendering via BaseTileLayout
- **UnifiedAuth** ← For user authentication state
- **TRPC** ← For fetching user map data
- **Mapping Domain** ← For coordinate system operations

## TO BE IMPROVED
- UserProfileTile has complex navigation logic that might belong in a service
- Render tracking logs could be consolidated into a performance monitoring pattern
- Props (centerCoordId, items) might be unnecessary now that Cache provides everything