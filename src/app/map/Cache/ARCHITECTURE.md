# MapCache Architecture

## Overview

The MapCache system provides efficient client-side caching and synchronization for hexagonal map data. It serves as the central orchestrator for all map operations and is used by multiple components including Canvas and Chat.

## Data Flow Architecture

### Region-Based Caching Strategy

#### Region Concept

A **region** represents a complete map dataset identified by `userId-groupId` pairs.

**Design Rationale**:
- **Data Locality**: Items within the same user-group context are frequently accessed together
- **Permission Boundaries**: User-group combinations align with data access permissions
- **Cache Efficiency**: Bulk loading reduces API calls and improves performance
- **Predictable Invalidation**: Changes can be efficiently invalidated at the region level

#### Hierarchical Loading Strategy

**Problem**: Large maps with thousands of items don't scale with region-based loading.

**Solution**: Depth-based incremental loading with practical limits.

**Core Principle**: Load items progressively based on their depth in the hierarchy:
- **Initial Load**: Center + immediate children + grandchildren (max ~43 items)
- **On-Demand Expansion**: Load additional depth levels when navigating/expanding
- **Background Prefetching**: Intelligently prefetch likely-to-be-accessed items

#### Item-Based Cache Key Structure

Cache individual items by their coordinates rather than by regions to avoid duplication and enable efficient updates:

```typescript
// Cache individual items by coordinates
interface ItemCacheKey {
  coordId: string; // "userId,groupId:path" - unique coordinate
  loadedAt: timestamp; // For cache invalidation
}

// Track which regions have been loaded
interface RegionMetadata {
  centerCoordId: string; // Focal point that was loaded
  maxDepth: number; // Maximum depth loaded from this center
  loadedAt: timestamp; // When this region was loaded
  itemCoordIds: string[]; // Which items were loaded
}
```

## Important: Understanding dbId vs coordId

The system uses two distinct identifier types that serve different purposes:

**dbId (Database ID)**:
- Type: `number`
- Purpose: Uniquely identifies a mapItem (tile) in the database
- Persistence: Stays constant even when a tile is moved to a different position
- Usage: CRUD operations, references in the database

**coordId (Coordinate ID)**:
- Type: `string`
- Format: `"{userId},{groupId}:{path}"`
- Purpose: Uniquely identifies a position in the hexagonal map hierarchy
- Persistence: Changes when an item moves - the coordId will then identify whatever item is at that position
- Usage: Cache keys, navigation, position-based operations

**Example**:
```typescript
// A tile with dbId=123 at position "1,2:A1B2"
const tile = {
  metadata: {
    dbId: 123,        // Permanent identifier for this tile
    coordId: "1,2:A1B2"  // Current position identifier
  }
};

// If this tile moves to position "1,2:C3D4":
// - dbId remains 123
// - coordId becomes "1,2:C3D4"
// - The old coordId "1,2:A1B2" now refers to whatever tile occupies that position
```

**Benefits**:
- **No Duplication**: Each item exists once in cache
- **Efficient Updates**: Updating an item updates it everywhere
- **Simple Invalidation**: Invalidate by coordId affects all regions
- **Memory Efficient**: No redundant storage
- **Consistent State**: Single source of truth per item

## Centralized Tile Action Management

### Problem: Hook Proliferation

With hundreds of tiles rendered simultaneously, individual hooks in each tile would create performance issues and memory overhead.

### Solution: Centralized Action Coordination

The DynamicMapCanvas acts as a **centralized action coordinator**:

1. **Provides Context**: Uses React Context to provide action handlers to all descendant tiles
2. **Coordinates by Coordinates**: Tiles identify themselves by coordinate ID for action routing
3. **Manages Interaction State**: Centralizes interaction mode logic (select, edit, delete, etc.)
4. **Optimizes Performance**: Single set of handlers shared across all tiles

**Benefits**:
- **Performance**: Single set of handlers instead of N×handlers for N tiles
- **Consistency**: All tiles use the same interaction logic
- **Maintainability**: Action logic centralized in one place
- **Flexibility**: Easy to add new interaction modes
- **Memory Efficiency**: Reduced memory footprint for large maps

## Event Bus Integration - Notification Pattern

MapCache emits **notification events** about completed operations. These are NOT commands or requests - they describe what already happened:

```typescript
interface MapCacheContext {
  // ... existing properties
  eventBus: EventBusService;
}

// CORRECT: Perform action, then notify
function swapTiles(tile1Id: string, tile2Id: string) {
  // 1. Perform the actual swap operation
  const result = performSwapOperation(tile1Id, tile2Id);
  
  // 2. Update cache state
  updateCacheWithSwapResult(result);
  
  // 3. Notify about what happened (past tense!)
  context.eventBus.emit({
    type: 'map.tiles_swapped',  // NOT 'map.swap_tiles'
    source: 'map_cache',
    payload: { 
      tile1Id, 
      tile2Id, 
      tile1Name: result.tile1Name, 
      tile2Name: result.tile2Name 
    }
  });
}
```

### Key Principles

1. **Events are Past Tense**: `tile_created`, not `create_tile`
2. **Events are Notifications**: They inform, not instruct
3. **No Event Chains**: Events don't trigger other operations
4. **Single Responsibility**: MapCache handles state, events handle communication

### Events Emitted by MapCache (All Past Tense)

- `map.tile_created` - A new tile was created
- `map.tile_updated` - A tile was edited
- `map.tile_deleted` - A tile was deleted
- `map.tiles_swapped` - Two tiles exchanged positions
- `map.tile_moved` - A tile was moved to a new location
- `map.navigation` - The center tile changed
- `map.expansion_changed` - Tiles were expanded/collapsed
- `map.import_completed` - Tiles were imported from another user

## Implementation Examples

### Hierarchical Loading Implementation

```typescript
interface HierarchicalMapCache {
  // Cache structure: items by coordId + region metadata
  itemsById: Record<string, HexTileData>; // Key: "userId,groupId:path"
  regionMetadata: Record<string, RegionMetadata>; // Key: "userId,groupId:centerPath"

  // Initial load for a map center
  loadMapRegion(
    centerCoordId: string, // "userId,groupId:path"
    maxDepth: number = 3,
  ): Promise<MapItem[]>;

  // Expansion load for a specific item
  loadItemChildren(
    itemCoordId: string, // "userId,groupId:path"
    maxDepth: number = 2,
  ): Promise<MapItem[]>;

  // Check if we have sufficient data for rendering
  hasRequiredDepth(centerCoordId: string, requiredDepth: number): boolean;

  // Check if a specific item is cached
  hasItem(coordId: string): boolean;

  // Get items for a specific region (from cache)
  getRegionItems(centerCoordId: string, maxDepth: number): HexTileData[];
}
```

### Centralized Tile Actions

```typescript
// Centralized tile actions hook
function useTileActions() {
  const { interactionMode } = useInteractionMode();
  const { mutations } = useMutations();

  const handleTileClick = useCallback((coordId: string, event: MouseEvent) => {
    switch (interactionMode) {
      case 'edit':
        mutations.setTileToMutate(coordId);
        break;
      case 'delete':
        // Show confirmation dialog
        break;
      case 'expand':
        // Handle expansion logic
        break;
    }
  }, [interactionMode, mutations]);

  return { handleTileClick, handleTileDrag, handleTileHover };
}

// Dynamic route tiles consume actions via context
function ItemTile({ item }) {
  const { onTileClick } = useTileActionsContext();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      onClick={(e) => onTileClick(item.metadata.coordId, e)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`hex-tile ${isHovered ? 'hovered' : ''}`}
    >
      <ItemContent item={item} />
      <ItemButtons item={item} />
    </div>
  );
}
```

## URL Synchronization

The cache system maintains bidirectional synchronization between application state and the URL, making map views shareable and bookmarkable.

### URL Parameters

The map URL contains two key parameters:

1. **`center`**: The database ID of the current center tile
   - Example: `/map?center=123`
   - Updated when navigating to a new tile

2. **`expandedItems`**: Comma-separated list of database IDs for expanded tiles
   - Example: `/map?center=123&expandedItems=456,789,101`
   - Updated when tiles are expanded or collapsed
   - Omitted when no tiles are expanded

### Navigation Behavior

When navigating to a new center:
- The URL is updated using `router.push()` (adds to browser history)
- Expanded items are filtered to keep only those within 1 generation of the new center
- Unrelated expanded tiles are automatically collapsed

### Expansion Behavior

When expanding or collapsing tiles:
- The URL is updated using `router.replace()` (no browser history)
- This allows sharing the exact view without cluttering the back button
- Multiple expanded tiles are comma-separated in the URL

## Architecture Notes

For implementation details about the Cache system's internal architecture (State, Handlers, Services, Sync layers), see the [README.md](./README.md).