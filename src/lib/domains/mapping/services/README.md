# Mapping Services

This folder contains the domain services for the mapping system, which manages hierarchical maps and items organized in a hexagonal coordinate system.

## Overview

The mapping domain provides functionality for creating, managing, and manipulating spatial maps where items are positioned using hexagonal coordinates. Each map is represented as a tree structure with a root USER item and descendant BASE items.

## Architecture

The services follow a layered architecture pattern:

```
MappingService (Main Coordinator)
├── MapManagementService (Map-level operations)
└── ItemManagementService (Item-level coordinator)
    ├── ItemCrudService (CRUD operations)
    └── ItemQueryService (Query & movement operations)
```

### Core Services

#### `MappingService`

Main entry point that coordinates all mapping operations. Provides access to:

- `service.maps.*` - Map-level operations
- `service.items.*` - Item-level operations

#### `MapManagementService`

Handles map-level operations:

- **Create maps**: Initialize new root USER items
- **Retrieve maps**: Get map data with all descendants
- **Update maps**: Modify map metadata (title, description)
- **Remove maps**: Delete entire map hierarchies
- **List user maps**: Get all maps for a user with pagination

#### `ItemManagementService`

Coordinates item-level operations through specialized services:

- `items.crud.*` - CRUD operations on individual items
- `items.query.*` - Querying and movement operations

#### `ItemCrudService`

Handles basic CRUD operations:

- **Add items**: Create new BASE items as children of existing items
- **Get items**: Retrieve items by coordinates
- **Update items**: Modify item attributes (title, description, URL)
- **Remove items**: Delete items and their descendants

#### `ItemQueryService`

Handles complex queries and operations:

- **Get descendants**: Retrieve all child items of a given item
  - Optional `includeComposition` parameter to include/exclude direction 0 subtrees
  - Default behavior excludes composition (backwards compatible)
- **Composition queries**: Query direction 0 (composed) children
  - `hasComposition(coordId)`: Check if a tile has direction 0 child
  - `getComposedChildren(coordId)`: Get composition container and its children
- **Move items**: Move items to new coordinates (with swapping support)
- **Get by ID**: Retrieve items by their database ID

## Key Concepts

### Coordinate System

Items are positioned using hexagonal coordinates (`HexCoord`):

```typescript
interface HexCoord {
  userId: number; // Owner of the coordinate space
  groupId: number; // Group within user's space
  path: HexDirection[]; // Path from center using hex directions
}
```

### Item Types

- **USER**: Root items representing maps
- **BASE**: Child items within maps

### Hierarchical Structure

- Each map has exactly one root USER item
- BASE items can have child BASE items
- All items maintain parent-child relationships
- Movement operations preserve hierarchical relationships

## Usage Examples

### Creating and Managing Maps

```typescript
const service = new MappingService(repositories);

// Create a new map
const newMap = await service.maps.createMap({
  userId: 123,
  groupId: 0,
  title: "My Map",
  descr: "Description",
});

// Get map data with all items
const mapData = await service.maps.getMapData({
  userId: 123,
  groupId: 0,
});

// Update map information
await service.maps.updateMapInfo({
  userId: 123,
  groupId: 0,
  title: "Updated Title",
});
```

### Working with Items

```typescript
// Add an item to a map
const newItem = await service.items.crud.addItemToMap({
  parentId: mapData.id,
  coords: { userId: 123, groupId: 0, path: [HexDirection.East] },
  title: "New Item",
});

// Move an item to new coordinates
await service.items.query.moveMapItem({
  oldCoords: { userId: 123, groupId: 0, path: [HexDirection.East] },
  newCoords: { userId: 123, groupId: 0, path: [HexDirection.West] },
});

// Get all descendants of an item (excludes composition by default)
const descendants = await service.items.query.getDescendants({
  itemId: newItem.id,
});

// Get all descendants including composition
const allDescendants = await service.items.query.getDescendants({
  itemId: newItem.id,
  includeComposition: true,
});

// Check if a tile has composition
const hasComp = await service.items.query.hasComposition({
  coordId: "1,0:2",
});

// Get composed children (direction 0 container and its children)
const composedItems = await service.items.query.getComposedChildren({
  coordId: "1,0:2",
});
```

## Testing

The `__tests__/` folder contains comprehensive integration tests that demonstrate:

- Map lifecycle operations
- Item CRUD operations
- Item movement and swapping
- Hierarchical relationship management
- Composition queries (direction 0 children)
- Error handling for edge cases

### Test Structure

- **Map lifecycle tests**: Creating, retrieving, updating, and removing maps
- **Item CRUD tests**: Basic operations on individual items
- **Item movement tests**: Moving items and handling collisions
- **Item relationships tests**: Testing hierarchical structures
- **Composition query tests**: Testing direction 0 children queries and filtering

## Dependencies

The services depend on:

- **Repository interfaces**: For data persistence abstraction
- **Domain actions**: For orchestrating complex operations
- **Type contracts**: For data transfer objects
- **Utilities**: For coordinate system operations

## Error Handling

Services implement comprehensive error handling for:

- Non-existent items/maps
- Invalid coordinate operations
- Constraint violations (e.g., moving USER items)
- Cross-space movement attempts
- Parent-child relationship violations
