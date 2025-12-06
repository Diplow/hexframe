# Map Item Queries

This folder contains specialized query classes for the MapItem repository. Each class handles a specific category of database operations for better maintainability and separation of concerns.

## Overview

The queries are organized by their purpose:

- **ReadQueries** - Read operations (fetch items, neighbors, coordinate lookups)
- **WriteQueries** - Create, update, and delete operations
- **SpecializedQueries** - Domain-specific queries (root items, descendants by path)
- **RelationQueries** - Relationship operations between map items
- **VisibilityFilter** - Visibility filtering for public/private access control

## Query Classes

### ReadQueries (`read-queries.ts`)

Handles basic read operations:
- `fetchItemWithBase()` - Fetch a single item with its base item data
- `fetchNeighbors()` - Get neighboring items by parent ID
- `findItemIdByCoords()` - Look up item ID by coordinates
- `fetchManyByIds()` - Bulk fetch items by ID array
- `fetchMany()` - Paginated fetch of all items

### WriteQueries (`write-queries.ts`)

Manages mutation operations:
- `createMapItem()` - Create a new map item
- `updateMapItem()` - Update an existing item's attributes
- `deleteMapItem()` - Delete an item
- `bulkDelete()` - Delete multiple items

### SpecializedQueries (`specialized-queries.ts`)

Contains domain-specific hierarchical queries:
- `getRootItem()` - Get root item for a user/group
- `getRootItemsForUser()` - Get all root items for a user
- `getDescendantsByParent()` - Get all descendants of a parent item
- `getComposedChildren()` - Get composed children (negative direction)
- `getRegularChildren()` - Get regular children (positive direction)

### RelationQueries (`relation-queries.ts`)

Handles relationship operations between map items (currently placeholder implementations).

### VisibilityFilter (`visibility-filter.ts`)

Provides SQL filter builders for visibility-based access control:
- `buildVisibilityFilter()` - Filter for single-owner queries
- `buildMultiOwnerVisibilityFilter()` - Filter for multi-owner queries

## Visibility Security

All read queries support visibility filtering:
- **Owners** see all their tiles regardless of visibility setting
- **Non-owners** only see tiles marked as `public`
- **Anonymous users** only see `public` tiles

The `requesterUserId` parameter controls which user is making the request for visibility checks.
