# CoordinateResolver

Abstraction layer for handling virtual composition coordinates in the Canvas rendering system.

## Mental Model

**The Problem**: Composition containers (coordinates ending in `,0`) are **virtual** - they don't exist as database items but need to be rendered as if they do.

**The Solution**: CoordinateResolver provides a clean API that abstracts away the virtual coordinate concept, making the rest of the codebase simpler.

```
Regular Coordinate:    1,0:3     → Item exists in mapItems → Display it
Virtual Coordinate:    1,0:3,0   → Item doesn't exist → Display parent (1,0:3)
Composition Child:     1,0:3,0,1 → Parent is virtual → Resolve to grandparent
```

## Responsibilities

- **Resolve display items**: Get the actual item to display at any coordinate, handling virtual containers
- **Resolve parent items**: Get the actual parent item, skipping virtual composition containers
- **Detect virtual coordinates**: Identify when a coordinate is a virtual composition container
- **Determine expansion state**: Check if a coordinate should render as expanded

## API

### Core Methods

```typescript
const resolver = new CoordinateResolver(mapItems);

// Get item to display (handles virtual containers)
const item = resolver.getDisplayItem("1,0:3,0");

// Get parent item (skips virtual parents)
const parent = resolver.getParentItem("1,0:3,0,1");

// Check if coordinate is virtual
const isVirtual = resolver.isVirtualContainer("1,0:3,0");

// Check expansion state (virtual containers always expanded)
const expanded = resolver.isExpanded("1,0:3,0", expandedItemIds);
```

## Usage Example

### Before (scattered special cases)
```typescript
// In DynamicFrameCore
let centerItem = mapItems[center];
if (!centerItem && center.endsWith(',0')) {
  const parentCoord = CoordSystem.getParentCoord(...);
  centerItem = mapItems[CoordSystem.createId(parentCoord)];
}

// In FrameSlot (center)
let displayItem = item;
if (!displayItem && isCenter && coordId.endsWith(',0')) {
  const parentCoord = CoordSystem.getParentCoord(...);
  displayItem = mapItems[CoordSystem.createId(parentCoord)];
}

// In FrameSlot (empty)
let parentItem = mapItems[parentCoordsId];
if (!parentItem && parentCoordsId.endsWith(',0')) {
  const grandparentCoords = CoordSystem.getParentCoord(...);
  parentItem = mapItems[CoordSystem.createId(grandparentCoords)];
}
```

### After (clean abstraction)
```typescript
const resolver = new CoordinateResolver(mapItems);

// In DynamicFrameCore
const centerItem = resolver.getDisplayItem(center);

// In FrameSlot (center)
const displayItem = resolver.getDisplayItem(coordId);

// In FrameSlot (empty)
const parentItem = resolver.getParentItem(coordId);
```

## Architecture

This subsystem has no child subsystems. It's a single-purpose utility that:
- Takes `mapItems` as input
- Provides clean coordinate resolution methods
- Handles all virtual coordinate logic internally

## Dependencies

- `~/app/map/types/tile-data` - TileData type
- `~/lib/domains/mapping/utils` - CoordSystem utilities
