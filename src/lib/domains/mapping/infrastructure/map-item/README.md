# Map Item Infrastructure Layer

This folder contains the database infrastructure implementation for the `MapItem` domain objects. It implements the repository pattern to handle persistence and retrieval of map items from the PostgreSQL database.

## Overview

The map item infrastructure layer serves as a bridge between the domain layer and the database, handling:

- **Persistence Operations**: Creating, reading, updating, and deleting map items
- **Data Mapping**: Converting between database records and domain objects
- **Query Management**: Organizing different types of database queries
- **Relationship Handling**: Managing connections between map items and related entities

## Architecture

### Core Components

#### `DbMapItemRepository` (`db.ts`)

The main repository class that implements the `MapItemRepository` interface. It delegates operations to specialized query classes and handles:

- CRUD operations on map items
- Coordinate-based item resolution
- Hierarchical queries (root items, descendants)
- Relationship management

#### Query Classes (`queries/`)

The repository is organized into specialized query classes for better maintainability:

- **`ReadQueries`**: Handles all read operations (fetch items, neighbors, coordinate lookups)
- **`WriteQueries`**: Manages create, update, and delete operations
- **`SpecializedQueries`**: Contains domain-specific queries (root items, descendants by path)
- **`RelationQueries`**: Handles relationship operations (currently placeholder implementations)

#### Data Mapping (`mappers.ts`)

Contains functions to convert between database types and domain objects:

- `mapJoinedDbToDomain()`: Converts joined DB results to domain objects
- `pathToString()` / `parsePathString()`: Handles path serialization for hex coordinates

#### Type Definitions (`types.ts`)

Defines TypeScript types for database operations:

- `DbMapItemSelect`: Database record structure
- `DbMapItemWithBase`: Joined result with base item data
- `CreateMapItemDbAttrs`: Attributes for creating new items
- `UpdateMapItemDbAttrs`: Partial attributes for updates

## Key Features

### Multi-Identity Resolution

Map items can be identified in multiple ways:

- **By ID**: Direct numeric identifier
- **By Coordinates**: Using user ID, group ID, and hex path
- **By Attributes**: Through the `MapItemIdr` union type

### Hierarchical Structure

Supports hierarchical relationships through:

- **Parent-Child Links**: Items can have parent items
- **Coordinate Paths**: Hex-based coordinate system for spatial relationships
- **Origin Tracking**: Items can reference their origin

### Coordinate System Integration

Integrates with the hex coordinate system for spatial mapping:

- Stores coordinates as user ID, group ID, and path
- Supports path-based descendant queries
- Handles coordinate-based item lookups

## Usage Examples

### Basic CRUD Operations

```typescript
// Create a new map item
const newItem = await repository.create({
  attrs: {
    coords: { userId: 1, groupId: 1, path: [0, 1] },
    itemType: MapItemType.CONTEXT,
    ref: { itemType: MapItemType.CONTEXT, itemId: 123 },
    parentId: null,
    originId: null,
  },
  relatedItems: {},
  relatedLists: {},
});

// Get an item by ID
const item = await repository.getOne(itemId);

// Get an item by coordinates
const itemByCoords = await repository.getOneByIdr({
  idr: { attrs: { coords: { userId: 1, groupId: 1, path: [0, 1] } } },
});

// Update an item
const updatedItem = await repository.updateByIdr({
  idr: { id: itemId },
  attrs: { parentId: newParentId },
});
```

### Hierarchical Queries

```typescript
// Get root item for a user in a group
const rootItem = await repository.getRootItem(userId, groupId);

// Get all root items for a user
const userRoots = await repository.getRootItemsForUser(userId);

// Get descendants of a parent item
const descendants = await repository.getDescendantsByParent({
  parentPath: [0, 1, 2],
  parentUserId: userId,
  parentGroupId: groupId,
  limit: 100,
});
```

## Database Schema Integration

This infrastructure layer works with two main database tables:

- **`map_items`**: Stores the map item metadata and coordinates
- **`base_items`**: Contains the actual content referenced by map items

The repository automatically handles joins between these tables to provide complete domain objects.

## Error Handling

The repository includes comprehensive error handling:

- Missing items throw descriptive errors
- Invalid identifiers are caught and reported
- Database constraint violations are properly propagated
- Cascading deletion is supported when enabled

## Future Enhancements

The relationship queries are currently placeholder implementations, indicating areas for future development:

- Full relationship management
- Bulk operations
- Advanced querying capabilities
- Performance optimizations for large hierarchies
