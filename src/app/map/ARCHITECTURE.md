# Map Application Architecture

## Overview

The map application provides a single dynamic route (`/map`) with full JavaScript interactivity, client-side caching, and real-time features. The architecture has been simplified from the previous dual-route approach to focus on delivering the best interactive experience.

**Architecture Evolution**: The system has evolved from a dual-route architecture (static + dynamic) to a single-route dynamic application. This simplification reduces maintenance overhead while maintaining the ability to render base components without interactivity when needed (e.g., loading states).

## Core Architectural Principles

### 1. Single-Route Dynamic Architecture

The application provides a unified dynamic experience:

- **Dynamic Route (`/map`)**: Full client-side interactivity with caching and real-time features
- **Base Components**: Reusable components (`BaseFrame`, `BaseTileLayout`) for rendering without interactivity when needed

### 2. Component Organization Strategy

**Unified Component Library**: All components live within the `/map` route hierarchy, with base components extracted for reusability in non-interactive contexts (e.g., loading states).

**Shared Business Logic**: Core business logic (domains, utilities) is centralized and shared across all components to maintain consistency.

**Focused Development**: Single architecture allows focused development on interactive features while maintaining clean component boundaries.

### 3. Event-Driven Communication

**Event Bus Pattern**: The map uses a shared event bus for cross-system communication, enabling loose coupling between components like MapCache and ChatCache.

```typescript
interface EventBusService {
  emit(event: AppEvent): void;
  on(eventType: string, listener: (event: AppEvent) => void): () => void;
}

// Event namespaces
// map.*   - Map operations (tile CRUD, navigation)
// chat.*  - Chat operations (messages, widgets)
// auth.*  - Authentication events
// sync.*  - Synchronization events
```

## State Management Strategy

### URL-First State Management

The application prioritizes URL parameters for shareable and bookmarkable state:

- **Expansion state**: Which tiles are expanded/collapsed
- **Focus state**: Current viewport center
- **Scale state**: Zoom level
- **Filter state**: Applied filters and search parameters

### Hierarchical State Layers

1. **URL State** (highest priority): Shareable, SEO-friendly, persistent across sessions
2. **localStorage State**: User preferences and interaction modes
3. **Component State**: Temporary UI state (drag operations, dialogs, loading states)
4. **Cache State**: Server data with background synchronization

## Component Architecture Layers

### 1. Page Layer (`page.tsx`)

**Responsibility**: Server-side data fetching, URL parameter parsing, initial data formatting

- Fetches map data via tRPC
- Validates and processes URL parameters
- Renders appropriate canvas component based on requirements
- Handles initial focus and redirection logic

### 2. Canvas Layer

#### Dynamic Canvas (`/map/Canvas/index.tsx`)

**Type**: Dynamic (Client-Side)

- Manages cache synchronization and background updates
- Provides centralized tile action management
- Handles client-side state and interactions
- Integrates with MapCache for data management
- Orchestrates layout of hex frames, controls, and overlays

### 3. Frame Layer

#### Dynamic Frame (`/map/Canvas/frame.tsx`)

**Type**: Dynamic (Client-Side)

- Recursive hexagonal layout rendering with client-side features
- Handles expansion with smooth transitions
- Manages drag-and-drop zones
- Integrates with centralized action management

#### Base Frame (`/map/components/BaseFrame.tsx`)

**Type**: Base Component (No Interactivity)

- Recursive hexagonal layout rendering for non-interactive contexts
- Used by loading skeleton and other static displays
- Pure rendering without client-side state
- Renders tile components in hexagonal patterns

### 4. Tile Layer

#### Dynamic Tiles

**ItemTile** (`/map/Tile/Item/item.tsx`)
- Full client-side interactivity
- Optimistic updates for edits
- Integrated with MapCache
- Real-time synchronization

**ItemButtons** (`/map/Tile/Item/item.buttons.tsx`)
- Dynamic button states based on permissions
- Client-side action handlers
- Loading states during mutations
- Context-aware visibility

#### Base Tile Components

**BaseTileLayout** (`/map/components/BaseTileLayout.tsx`)
- Core hexagonal tile rendering
- Handles sizing, colors, and strokes
- Used by all tile types for consistent appearance
- No interactivity or state management

### 5. Controls Layer

#### ActionPanel (`Controls/ActionPanel.tsx`)

**Type**: Pseudo-Static (localStorage + URL)

- Manages interaction modes (select, edit, delete, etc.)
- Persists state to localStorage
- Updates document cursor based on mode
- No server-side state dependencies

#### ScaleController (`Controls/scale.controller.tsx`)

**Type**: Pseudo-Static (URL State)

- Manages zoom level through URL parameters
- Uses Next.js router for navigation
- Loading states during transitions

### 6. Communication Layer (Event Bus)

#### Event Bus Service

**Type**: Shared Infrastructure

The event bus enables communication between independent systems (MapCache, ChatCache, future services) without creating direct dependencies:

```typescript
// Event bus is provided at the app level
const eventBus = new EventBus();

// Systems receive it via props/context
<MapCacheProvider eventBus={eventBus}>
  <ChatCacheProvider eventBus={eventBus}>
```

**Key Benefits**:
- **Loose Coupling**: Systems don't know about each other
- **Extensibility**: Easy to add new listeners (analytics, undo/redo)
- **Testability**: Event bus can be mocked/spied in tests
- **Debuggability**: All cross-system communication flows through one place

**Example Flow - Tile Swap**:
```typescript
// MapCache emits when tiles are swapped
eventBus.emit({
  type: 'map.tiles_swapped',
  source: 'map_cache',
  payload: { tile1Id, tile2Id, tile1Name, tile2Name }
});

// ChatCache listens and creates appropriate UI
eventBus.on('map.tiles_swapped', (event) => {
  // Show system message about the swap
});
```

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

#### Important: Understanding dbId vs coordId

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

## Key Features

### Core Dynamic Features

**1. Map Edition (CRUD + Move Operations)**

- Immediate feedback with optimistic updates
- Complex state management with MapCache
- Real-time synchronization

**2. Authentication State Management**

- Session changes and permission updates
- Real-time auth status
- Auth context with dynamic components

**3. URL-Based Navigation**

- Shareable state via URL parameters
- Instant navigation with client-side routing
- SEO-friendly implementation

**4. Tile Expansion/Collapse**

- URL expandedItems parameter for shareable state
- Smooth transitions with client-side animations
- Maintains state across page refreshes

**5. Scale Changes**

- URL parameter with smooth zoom transitions
- Client-side rendering optimizations
- Consistent state management


## Performance Optimizations

### Client-Side Performance

- **Smooth Interactions**: Instant client-side state updates
- **Background Sync**: Fresh data without page reloads
- **Optimistic Updates**: Immediate feedback for user actions
- **Intelligent Caching**: Reduced server load and faster navigation
- **Centralized Actions**: Single set of handlers for hundreds of tiles

### Server-Side Benefits

- **Initial SSR**: Fast first contentful paint
- **Shareable URLs**: All state encoded in URL
- **SEO Optimized**: Server-rendered content for crawlers
- **Progressive Loading**: Hierarchical data loading strategy

## Development Guidelines

### Component Types

**Base Components** (`/map/components/`)
- Pure rendering logic
- No state or interactivity
- Used for loading states and non-interactive displays
- Examples: `BaseFrame`, `BaseTileLayout`

**Dynamic Components** (`/map/`)
- Full interactivity and state management
- Real-time updates and mutations
- Integrated with cache systems
- Examples: `DynamicItemTile`, `DynamicMapCanvas`

### Component Naming Convention

- `Base*`: Pure rendering components without interactivity
- `Dynamic*`: Client-side enhanced components
- `*Controller`: Components managing URL/localStorage state
- `use*Manager`: Hooks for complex state management
- `use*Cache`: Hooks for cache operations

## Architecture Evolution

### Completed Migration

- ✅ Unified component architecture
- ✅ Base components extracted for reusability
- ✅ Validation utilities moved to domain layer
- ✅ Simplified imports and dependencies
- ✅ Removed duplicate static/dynamic components

### Current Architecture

- ✅ MapCacheProvider and useMapCache hook
- ✅ DynamicMapCanvas with centralized actions
- ✅ Background synchronization
- ✅ Create/Update/Delete flows with dynamic dialogs
- ✅ Real-time updates with optimistic mutations

### Future Enhancements

- 📋 Drag-and-drop with DraggableItemTile
- 📋 Real-time collaboration features
- 📋 Advanced caching strategies
- 📋 Progressive enhancement for base components

---

## Implementation Examples

### Base Component Pattern

**Pattern 1: Base Components for Non-Interactive Rendering**

```typescript
// Base component for rendering without interactivity (/map/components/BaseFrame.tsx)
export function BaseFrame({ 
  center, 
  mapItems, 
  expandedItemIds,
  interactive = false 
}: BaseFrameProps) {
  // Pure rendering logic, no hooks or state
  return (
    <BaseTileLayout scale={scale} color={color}>
      {/* Recursive hexagonal layout */}
    </BaseTileLayout>
  );
}

// Dynamic component with full interactivity (/map/Canvas/frame.tsx)
export function DynamicFrame({ item, urlInfo }) {
  const { updateItem } = useMutations();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="hex-tile">
      <ItemContent item={item} />
      <ItemButtons 
        onEdit={() => setIsEditing(true)}
        onDelete={() => handleDelete(item.id)}
      />
      {isEditing && <EditDialog onSubmit={updateItem} />}
    </div>
  );
}
```

**Pattern 2: Loading States Using Base Components**

```typescript
// Loading skeleton using base components (/map/Canvas/LifeCycle/loading-skeleton.tsx)
export function MapLoadingSkeleton({ message = "Loading map..." }) {
  const mockMapItems = createMockItems();
  
  return (
    <BaseFrame
      center={centerCoord}
      mapItems={mockMapItems}
      expandedItemIds={[]}
      interactive={false}  // No interactivity during loading
    />
  );
}
```

**Pattern 3: Unified Architecture**

```typescript
// Single route with dynamic capabilities (/map/page.tsx)
export default async function MapPage({ searchParams }) {
  const { center } = await searchParams;
  const initialData = await fetchMapData(center);
  
  return (
    <MapCacheProvider initialData={initialData}>
      <DynamicMapCanvas searchParams={searchParams} />
    </MapCacheProvider>
  );
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

