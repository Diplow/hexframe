# Map Application Architecture

## Overview

The map application provides two separate routes:
- `/map` - Dynamic, JavaScript-required version with full interactivity
- `/static/map` - Static, server-rendered version that works without JavaScript

This separation allows users to choose the appropriate version based on their needs and capabilities.

**Important Note**: The architecture has evolved from the original progressive enhancement approach (where static components were enhanced) to a **dual-route architecture** where static and dynamic versions maintain separate component hierarchies. This provides clearer separation of concerns and simpler implementation.

## Core Architectural Principles

### 1. Dual-Route Architecture

The application provides two distinct experiences:

- **Static Route (`/static/map`)**: Pure server-side rendering with URL-based state management
- **Dynamic Route (`/map`)**: Full client-side interactivity with caching and real-time features

### 2. Component Separation Strategy

**Route-Based Separation**: Static and dynamic components live in separate route hierarchies (`/static/map` vs `/map`), avoiding complexity of progressive enhancement while maintaining clear boundaries.

**Shared Business Logic**: While UI components are separate, core business logic (domains, utilities) is shared between routes to maintain consistency.

**Parallel Development**: Both routes can evolve independently based on their constraints - static route prioritizes SSR and accessibility, dynamic route prioritizes interactivity and real-time features.

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

#### Dynamic Route Canvas (`/map/Canvas/index.tsx`)

**Type**: Dynamic (Client-Side)

- Manages cache synchronization and background updates
- Provides centralized tile action management
- Handles client-side state and interactions
- Integrates with MapCache for data management

#### Static Route Canvas (`/static/map/Canvas/index.tsx`)

**Type**: Static (Pure Rendering)

- Orchestrates layout of hex frames, controls, and overlays
- Works with server-provided data only
- No client-side state management or side effects
- Pure SSR with URL-based interactions

### 3. Frame Layer

#### Dynamic Route Frame (`/map/Canvas/frame.tsx`)

**Type**: Dynamic (Client-Side)

- Recursive hexagonal layout rendering with client-side features
- Handles expansion with smooth transitions
- Manages drag-and-drop zones
- Integrates with centralized action management

#### Static Route Frame (`/static/map/Canvas/frame.tsx`)

**Type**: Static (Pure Rendering)

- Recursive hexagonal layout rendering
- Handles expansion logic based on URL parameters
- No client-side state or interactions
- Renders tile components in hexagonal patterns

### 4. Tile Layer

#### Dynamic Route Tiles

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

#### Static Route Tiles

**ItemTile** (`/static/map/Tile/Item/item.tsx`)
- Server-rendered content
- URL-based expand/collapse
- Form-based interactions (edit/delete)
- No JavaScript dependencies

**ItemButtons** (`/static/map/Tile/Item/item.buttons.tsx`)
- Static links to edit/delete pages
- Visibility based on server-side permissions
- Progressive enhancement ready
- Fallback patterns for mutations

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

## Dynamic Requirements Analysis

### Confirmed Dynamic Requirements

**1. Map Edition (CRUD + Move Operations)**

- **Why Dynamic**: Immediate feedback, optimistic updates, complex state management
- **Implementation**: Dynamic mutations with cache updates

**2. Authentication State Management**

- **Why Dynamic**: Session changes, permission updates, real-time auth status
- **Implementation**: Auth context with dynamic components

### Features That Work Well Pseudo-Static

**3. Tile Navigation**

- **Current Approach**: URL-based navigation (instant, SEO-friendly, shareable)
- **Recommendation**: Keep pseudo-static - URL navigation is more robust

**4. Tile Expansion/Collapse**

- **Current Approach**: URL expandedItems parameter
- **Why Superior**: Shareable state, SEO benefits, simple implementation

**5. Scale Changes**

- **Current Approach**: URL parameter with page re-render
- **Recommendation**: Keep pseudo-static - scale changes are infrequent

### Decision Framework

**Make Dynamic If**:

- Requires immediate user feedback
- Involves complex state management
- Benefits from optimistic updates
- Needs real-time data synchronization

**Keep Pseudo-Static If**:

- State should be shareable via URL
- Feature is used infrequently
- SEO/accessibility is important
- Implementation complexity is high relative to benefit

## Dynamic-to-Static Fallback Strategy

### Selective Fallback Implementation

**Tier 1: Core Features - Full Fallback**

- Essential features that MUST work without JS
- Examples: View map, navigate tiles, expand tiles, basic auth

**Tier 2: Enhanced Features - Graceful Degradation**

- Features that enhance UX but aren't critical
- Examples: Create/edit tiles (fallback to dedicated pages), delete tiles (fallback to confirmation pages)

**Tier 3: Dynamic-Only Features - Clear Limitations**

- Features that only work with JS, but clearly communicate this
- Examples: Drag-and-drop, real-time sync, optimistic updates

## Performance Implications

### Current Benefits

- **Instant Initial Loads**: Full SSR with no hydration delay
- **SEO Optimized**: All content available to crawlers
- **Shareable URLs**: All state encoded in URL
- **No JavaScript Required**: Basic functionality works without JS

### Dynamic Enhancements

- **Smooth Interactions**: Client-side state updates
- **Background Sync**: Fresh data without page reloads
- **Optimistic Updates**: Immediate feedback for user actions
- **Intelligent Caching**: Reduced server load and faster navigation

## Development Guidelines

### When to Use Static Components

- Pure rendering logic
- Server-side rendering requirements
- Shareable/bookmarkable state
- SEO-critical content

### When to Use Dynamic Components

- Real-time interactions
- Optimistic updates
- Complex state management
- Background data synchronization

### Component Naming Convention

- `Static*`: Pure rendering components
- `Dynamic*`: Client-side enhanced components
- `*Controller`: Pseudo-static components with URL/localStorage state
- `use*Manager`: Hooks for complex state management

## Migration Strategy

### Phase 1: Foundation (Current)

- ✅ Static components with URL state
- ✅ Pseudo-static interactions via navigation
- ✅ Server-side rendering and data fetching

### Phase 2: Cache System

- 🔄 MapCacheProvider and useMapCache hook
- 🔄 DynamicMapCanvas as bridge component
- 🔄 Background synchronization

### Phase 3-6: Feature Enhancement

- 📋 Create/Update/Delete flows with dynamic dialogs
- 📋 Drag-and-drop with DraggableItemTile
- 📋 Real-time collaboration features
- 📋 Advanced caching strategies

---

## Implementation Examples

### Route-Based Component Separation

**Pattern 1: Separate Implementations**

```typescript
// Dynamic route component (/map/Tile/Item/item.tsx)
export function ItemTile({ item, urlInfo }) {
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

// Static route component (/static/map/Tile/Item/item.tsx)
export function ItemTile({ item, urlInfo }) {
  return (
    <div className="hex-tile">
      <ItemContent item={item} />
      <ItemButtons 
        editHref={`/map/edit/${item.id}`}
        deleteHref={`/map/delete/${item.id}`}
      />
    </div>
  );
}
```

**Pattern 2: Route-Specific Data Sources**

```typescript
// Dynamic route - uses client-side cache (/map/Canvas/index.tsx)
export function MapCanvas({ centerInfo }) {
  const { state } = useMapCache();
  const { mutations } = useMutations();
  
  return (
    <Canvas 
      items={state.itemsById} 
      centerInfo={centerInfo}
      onTileAction={mutations.handleAction}
    />
  );
}

// Static route - uses server data (/static/map/Canvas/index.tsx)  
export function MapCanvas({ items, centerInfo }) {
  return (
    <Canvas 
      items={items} 
      centerInfo={centerInfo}
      // Actions handled via URL navigation
    />
  );
}
```

**Pattern 3: Route-Based Selection**

```typescript
// Dynamic route (/map/page.tsx)
export default async function MapPage({ searchParams }) {
  const { center } = await searchParams;
  return <DynamicMapPage params={{ id: center }} searchParams={searchParams} />;
}

// Static route (/static/map/page.tsx)
export default async function StaticMapPage({ searchParams }) {
  const data = await fetchData();
  return <StaticMapCanvas items={data} />;
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

### Feature Detection Pattern

```typescript
function useFeatureDetection() {
  const [capabilities, setCapabilities] = useState({
    hasJS: false,
    hasLocalStorage: false,
    hasWebSockets: false,
  });

  useEffect(() => {
    setCapabilities({
      hasJS: true,
      hasLocalStorage: typeof localStorage !== "undefined",
      hasWebSockets: typeof WebSocket !== "undefined",
    });
  }, []);

  return capabilities;
}

function AdaptiveFeature({ children, fallback, requiresJS = true }) {
  const { hasJS } = useFeatureDetection();

  if (requiresJS && !hasJS) {
    return fallback;
  }

  return children;
}
```
