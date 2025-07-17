# Map Cache System

## Overview

The Map Cache system provides efficient client-side caching and synchronization for hexagonal map data. It serves as the central orchestrator for all map operations, including queries, mutations, navigation, and storage. The cache implements a clean architecture with separated concerns while providing a unified interface for data management.

## Architecture

The cache system is organized into four main layers:

### 1. State Layer (`/State`)
- Pure reducer-based state management
- Actions, reducers, and selectors
- No side effects or external dependencies
- Fully tested with unit tests

### 2. Handlers Layer (`/Handlers`)
- Business logic for data fetching, mutations, and navigation
- Orchestrates between state and services
- Mutation handler integrates tRPC mutations with cache operations
- Coordinates optimistic updates, server calls, URL updates, and storage
- Emits events via event bus for cross-system communication
- Isolates mutation state to prevent unnecessary re-renders
- Fully tested with unit tests

### 3. Services Layer (`/Services`)
- Infrastructure services for server communication and storage
- Abstracts external dependencies (tRPC, localStorage)
- Provides retry logic and error handling
- Fully tested with unit tests

### 4. Sync Layer (`/Sync`) - *Not Yet Implemented*
- Background synchronization engine (planned)
- Will handle periodic refresh and conflict resolution
- Will manage online/offline state
- Will coordinate with mutations during offline/online transitions
- Currently contains placeholder code with tests

### 5. Event Bus Integration
The MapCache integrates with a shared event bus to notify other systems about map operations:

```typescript
interface MapCacheContext {
  // ... existing properties
  eventBus: EventBusService;
}

// Example: Notify when tiles are swapped
function swapTiles(tile1Id: string, tile2Id: string) {
  // Perform swap operation...
  
  // Emit event for other systems
  context.eventBus.emit({
    type: 'map.tiles_swapped',
    source: 'map_cache',
    payload: { tile1Id, tile2Id, tile1Name, tile2Name }
  });
}
```

This enables:
- Chat system to show operation feedback
- Future analytics tracking
- Undo/redo functionality
- Any other system that needs to react to map changes

**Events Emitted by MapCache**:
- `map.tile_created` - When a new tile is created
- `map.tile_updated` - When a tile is edited
- `map.tile_deleted` - When a tile is deleted
- `map.tiles_swapped` - When two tiles exchange positions
- `map.tile_moved` - When a tile is moved to a new location
- `map.navigation` - When the center tile changes
- `map.expansion_changed` - When tiles are expanded/collapsed
- `map.import_completed` - When tiles are imported from another user

## Design Decisions

### Centralized Mutation Handling

The cache serves as the single source of truth for all data operations, including mutations. This design provides several benefits:

1. **Simplified Mental Model**: "The cache handles the data and the logic to change this data"
2. **Consistent Orchestration**: All mutations follow the same pattern (optimistic update → server call → finalize/rollback)
3. **Modal-Driven Mutations**: Since mutations happen through modals (one at a time), we avoid concurrent mutation conflicts
4. **Isolated Mutation State**: Mutation loading/error states don't trigger re-renders of data-dependent components

Key implementation details:
- tRPC mutation hooks are created inside the MapCacheProvider
- Mutation operations expose promises (via `mutateAsync`), not reactive state
- Tiles only re-render when their data changes, not when mutation state changes
- The modal that performs mutations can access loading/error state separately if needed

## Testing

### Running Tests

Due to a conflict between the vitest workspace configuration (which runs Storybook tests in a browser environment) and the jsdom environment needed for React component tests, there are two ways to run the Cache tests:

1. **Run all non-DOM tests** (recommended):
   ```bash
   ./scripts/run-cache-tests-no-dom.sh
   ```
   This runs all Cache tests except the React component tests (map-cache-provider.test.tsx and dom-test.test.tsx).

2. **Run specific test files**:
   ```bash
   # Run individual test files without workspace interference
   VITEST_WORKSPACE= npx vitest run --config vitest.config.ts src/app/map/Cache/State/__tests__/reducer.test.ts
   ```

### Test Status

- ✅ **State tests**: All passing (103 tests)
- ✅ **Handler tests**: All passing (55 tests)
- ✅ **Service tests**: All passing (58 tests)
- ✅ **Sync tests**: All passing (31 tests, 1 skipped) - *Note: Sync functionality not yet implemented, tests are for placeholder code*
- ✅ **Integration tests**: All passing (24 tests)
- ❌ **React component tests**: Failing due to DOM environment issue (27 tests)

The React component tests fail because the vitest workspace configuration runs them in a browser environment (for Storybook) instead of jsdom. This is a configuration issue, not a code issue.

### Known Issues

1. **DOM Environment Tests**: The `map-cache-provider.test.tsx` and `dom-test.test.tsx` files fail when run through the normal test runner due to the workspace configuration conflict. These tests pass when run individually with the proper configuration.

2. **Sync Timing Test**: One test in `sync-engine.test.ts` ("prevents sync in progress conflicts") is skipped due to timing issues in the test environment. The functionality is implicitly tested through other sync tests.

## Integration

To integrate the Cache system into your application:

1. **Import the provider and create event bus**:
   ```tsx
   import { MapCacheProvider } from './Cache/map-cache';
   import { EventBus } from './Services/EventBus/event-bus';
   
   const eventBus = new EventBus();
   ```

2. **Wrap your map components**:
   ```tsx
   <MapCacheProvider
     initialItems={items}
     initialCenter={centerCoordId}
     initialExpandedItems={expandedItemIds}
     mapContext={{
       rootItemId: rootItemId,
       userId: userId,
       groupId: groupId,
     }}
     cacheConfig={{
       maxAge: 300000, // 5 minutes
       backgroundRefreshInterval: 30000, // 30 seconds
       enableOptimisticUpdates: true,
       maxDepth: 3,
     }}
     eventBus={eventBus}
   >
     {children}
   </MapCacheProvider>
   ```

3. **Use the hooks in components**:
   ```tsx
   import { useMapCache, useMapCacheData } from './Cache/map-cache';
   
   // Get all operations
   const cache = useMapCache();
   
   // Or get specific operations
   const { getItem, getRegion } = useMapCacheData();
   ```

## Usage Example

### Reading Data
```tsx
function MapTile({ coordinate }: { coordinate: HexCoordinate }) {
  const { getItem, loadRegion } = useMapCacheData();
  const { navigateToTile } = useMapCacheNavigation();
  
  // Get item from cache
  const item = getItem(coordinate);
  
  // Load region if needed
  useEffect(() => {
    loadRegion(coordinate);
  }, [coordinate]);
  
  // Navigate on click
  const handleClick = () => {
    navigateToTile(coordinate);
  };
  
  return <div onClick={handleClick}>{item?.title}</div>;
}
```

### Mutations through the Cache
```tsx
function CreateItemModal({ coordId, onClose }: Props) {
  const { createItemOptimistic } = useMapCache();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      // The cache handles everything:
      // 1. Optimistic update (immediate UI feedback)
      // 2. Server call (via tRPC mutation)
      // 3. URL update (if needed)
      // 4. localStorage sync
      // 5. Rollback on error
      await createItemOptimistic(coordId, {
        title: formData.title,
        description: formData.description,
        url: formData.url,
      });
      
      onClose();
    } catch (error) {
      // Error is already handled by cache (rollback applied)
      console.error('Failed to create item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

## Features

- **Efficient region-based loading**: Loads hexagonal regions (7 tiles) at once
- **Centralized mutation orchestration**: All mutations flow through the cache with consistent patterns
- **Optimistic updates**: Immediate UI updates with automatic rollback on failure
- **Smart re-rendering**: Components only re-render when their data changes, not on mutation state changes
- **Background sync**: *Not yet implemented* - Will provide automatic periodic refresh of visible regions
- **Offline support**: *Partially implemented* - localStorage persistence works, queued mutations not yet implemented
- **Conflict resolution**: *Not yet implemented* - Will handle concurrent edits gracefully
- **Type-safe**: Full TypeScript support with strict types
- **Progressive enhancement**: Works with SSR and hydration

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

### Initial Load

On page load, the cache reads from URL parameters:
- The `center` parameter determines the initial center tile
- The `expandedItems` parameter restores previously expanded tiles
- Invalid or inaccessible tile IDs are silently ignored

### Example URLs

```
# Simple view with no expansions
/map?center=123

# View with one expanded tile
/map?center=123&expandedItems=456

# View with multiple expanded tiles
/map?center=123&expandedItems=456,789,101

# After navigation, unrelated expansions are removed
# Before: /map?center=123&expandedItems=456,789,999
# After:  /map?center=789&expandedItems=456
# (999 was removed as it's not within 1 generation of new center 789)
```

### Implementation Details

The URL synchronization is handled by the navigation handler:
- `toggleItemExpansionWithURL()` updates the URL when tiles are expanded/collapsed
- `navigateToItem()` updates both center and filters expanded items
- The router instance is accessed via Next.js navigation hooks

This design ensures that:
- Map views are fully shareable via URL
- The browser back button is reserved for actual navigation, not UI state changes
- URLs remain clean and human-readable
- State is preserved across page refreshes

## Architecture Notes

### Service Layer and Mutations
The Services layer (`/Services`) intentionally does NOT handle mutations. While the `ServerService` interface includes mutation methods (for type consistency), they throw architectural errors when called. This is by design:

- **Mutations use tRPC hooks** created in the MapCacheProvider
- **The mutation handler** orchestrates these hooks imperatively
- **Server-side contexts** (API routes, server actions) can use mutations directly through the static service

This separation ensures we follow React Query patterns while providing a unified cache interface.

### Trade-offs of Centralized Mutations

**Benefits:**
- Single source of truth for all data operations
- Consistent mutation patterns across the application
- Simplified component code (just call cache methods)
- Centralized testing of mutation logic

**Considerations:**
- Single mutation state per operation type (works well with modal-driven UI)
- Must carefully isolate mutation state to prevent unnecessary re-renders
- Requires discipline to maintain separation between data and mutation state

## Core Concepts

### CacheCoordinator
The main orchestrator that coordinates all cache operations across handlers and services. It manages the relationships between different cache components and ensures consistent data flow.

### OptimisticChangeTracker
Manages optimistic updates and their rollbacks. Tracks pending changes, maintains rollback data, and provides methods to revert optimistic updates when server operations fail.

### CacheLifecycleManager
Handles the provider lifecycle, including initialization, effects management, and cleanup. Coordinates sync operations and manages the timing of data loads.

### MutationCoordinator
Coordinates optimistic updates with server mutations. Encapsulates the complex logic of applying optimistic changes, making server calls, and handling success/failure scenarios.

### CacheContextBuilder
Responsible for building the context value from all cache components. Ensures a stable context value that minimizes unnecessary re-renders.

## Development

### Adding New Features

1. **State changes**: Add new actions and update the reducer
2. **Business logic**: Add methods to the appropriate handler
3. **For mutations**: Update the mutation handler to orchestrate the new operation
4. **External calls**: Update or add service methods (queries only)
5. **Tests**: Write tests for each layer

### Debugging

Enable debug logging by setting:
```typescript
window.localStorage.setItem('DEBUG_CACHE', 'true');
```

This will log all cache actions and state changes to the console.