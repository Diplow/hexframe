# API Routers

This folder contains the tRPC router definitions that expose the backend API endpoints for the mapping application. The routers follow a domain-driven design approach, organizing endpoints by functional areas and responsibilities.

## Architecture Overview

The API is structured around two main domains:

- **Authentication**: User authentication, registration, and session management
- **Mapping**: User maps and map items management with hexagonal coordinate system

## Files Overview

### Core Routers

- **`auth.ts`** - Authentication router handling user login, logout, registration, and session management using better-auth
- **`map.ts`** - Main mapping router that combines user and items sub-routers with legacy flat endpoint support
- **`map-user.ts`** - User map management router for creating, updating, and managing user's root maps
- **`map-items.ts`** - Map items router for CRUD operations on individual items within maps

### Supporting Files

- **`map-schemas.ts`** - Zod validation schemas for all map-related data structures and operations
- **`_map-auth-helpers.ts`** - Private helper functions for authentication checks and response formatting

## Domain Structure

### Authentication Domain (`auth.ts`)

- `register` - User registration (delegates to client-side better-auth)
- `login` - Email/password authentication
- `logout` - User session termination
- `getSession` - Current session retrieval

### Mapping Domain

#### User Maps (`map-user.ts`)

- `getMyRootItems` - Get all user's maps with pagination
- `createUserMap` - Create new map for user
- `updateUserMapInfo` - Update map metadata
- `removeUserMap` - Delete map and all descendants
- `createDefaultMapForCurrentUser` - Bootstrap default map
- `getUserMap` - Get user's primary map

#### Map Items (`map-items.ts`)

**CRUD Operations:**
- `getRootItemById` - Get map by ID
- `getItemByCoords` - Get item at specific hexagonal coordinates (supports negative directions)
- `getItemsForRootItem` - Get all items in a map
- `addItem` - Add new item to map (supports negative directions for composed children)
- `removeItem` - Delete item from map
- `updateItem` - Modify item properties (preserves negative directions)
- `moveMapItem` - Move item to new coordinates (supports moving composed children)
- `copyMapItem` - Deep copy item and subtree (preserves composed children)

**Relationship Queries:**
- `getDescendants` - Get all child items (with optional composition filtering)
- `getAncestors` - Get all parent items in path

**Composition Queries:**
- `getComposedChildren` - Get only composed children (negative directions) for a tile
- `hasComposition` - Check if tile has composed children

**History:**
- `getItemHistory` - Get version history for a tile
- `getItemVersion` - Get specific historical version

## Coordinate System

The mapping system uses hexagonal coordinates represented by:

```typescript
{
  userId: number,
  groupId: number,
  path: number[]  // Array of directions (positive for structural, negative for composed)
}
```

### Direction System

The coordinate path supports both **structural children** (positive directions 1-6) and **composed children** (negative directions -1 to -6):

**Structural Directions (1-6):**
- `1` - NorthWest: Regular child in northwest position
- `2` - NorthEast: Regular child in northeast position
- `3` - East: Regular child in east position
- `4` - SouthEast: Regular child in southeast position
- `5` - SouthWest: Regular child in southwest position
- `6` - West: Regular child in west position

**Composed Directions (-1 to -6):**
- `-1` - ComposedNorthWest: Composed child in northwest position
- `-2` - ComposedNorthEast: Composed child in northeast position
- `-3` - ComposedEast: Composed child in east position
- `-4` - ComposedSouthEast: Composed child in southeast position
- `-5` - ComposedSouthWest: Composed child in southwest position
- `-6` - ComposedWest: Composed child in west position

**Examples:**
```typescript
// Structural child (regular hierarchy)
{ userId: 1, groupId: 0, path: [1, 3] }  // NorthWest → East

// Composed child (behavioral modifier)
{ userId: 1, groupId: 0, path: [1, -3] }  // NorthWest → ComposedEast

// Mixed hierarchy
{ userId: 1, groupId: 0, path: [1, -3, 2] }  // Structural → Composed → Structural
```

## Authentication & Authorization

- **Public endpoints**: Authentication routes and some read operations
- **Protected endpoints**: User map management requires authentication
- **Middleware**: `mappingServiceMiddleware` injects domain services into context

## Usage Patterns

### Creating a Map

```typescript
// Create user map
const map = await trpc.map.user.createUserMap.mutate({
  groupId: 0,
  title: "My Map",
  descr: "Map description",
});

// Add items to map
const item = await trpc.map.items.addItem.mutate({
  parentId: map.id,
  coords: { userId: 1, groupId: 0, path: [0] },
  title: "Item Title",
});
```

### Querying Items

```typescript
// Get all user maps
const maps = await trpc.map.user.getMyRootItems.query({
  limit: 10,
  offset: 0,
});

// Get specific item
const item = await trpc.map.items.getItemByCoords.query({
  coords: { userId: 1, groupId: 0, path: [1] },
});

// Get composed child (negative direction)
const composedChild = await trpc.map.items.getItemByCoords.query({
  coords: { userId: 1, groupId: 0, path: [1, -3] },  // Parent → ComposedEast
});
```

### Working with Composition

```typescript
// Check if tile has composed children
const hasComp = await trpc.map.items.hasComposition.query({
  coordId: "1,0:1",  // Check tile at path [1]
});

if (hasComp) {
  // Get all composed children for tile
  const composed = await trpc.map.items.getComposedChildren.query({
    coordId: "1,0:1",
  });

  // Each composed item has negative direction in path
  composed.forEach(item => {
    console.log(item.coords);  // e.g., "1,0:1,-3" (NorthWest → ComposedEast)
  });
}

// Add composed child
const composedItem = await trpc.map.items.addItem.mutate({
  parentId: parentItem.id,
  coords: { userId: 1, groupId: 0, path: [1, -3] },  // Negative direction
  title: "Behavioral Modifier",
  content: "This modifies parent behavior",
});

// Get descendants excluding composition
const structuralOnly = await trpc.map.items.getDescendants.query({
  itemId: parentItem.id,
  includeComposition: false,  // Excludes negative directions
});

// Get all descendants including composition
const allDescendants = await trpc.map.items.getDescendants.query({
  itemId: parentItem.id,
  includeComposition: true,  // Includes negative directions
});
```

## Legacy Support

The main `map.ts` router provides flat endpoints for backward compatibility, allowing both nested (`map.user.createUserMap`) and flat (`map.createUserMap`) access patterns.

## Error Handling

All routers use tRPC's built-in error handling with appropriate HTTP status codes:

- `UNAUTHORIZED` for authentication failures
- `NOT_FOUND` for missing resources
- `INTERNAL_SERVER_ERROR` for unexpected errors
- `NOT_IMPLEMENTED` for placeholder endpoints

## Dependencies

- **tRPC**: API framework and type safety
- **Zod**: Runtime validation and TypeScript integration
- **better-auth**: Authentication provider
- **Domain Services**: Injected via middleware for business logic
