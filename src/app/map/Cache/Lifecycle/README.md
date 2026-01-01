# Lifecycle

## Mental Model

The Lifecycle subsystem manages the **operational lifecycle of cache interactions** - from initial setup through mutations, coordination, and optimistic updates. It orchestrates how different cache operations work together throughout their lifecycle.

## Responsibilities

- **Provider initialization**: Initialize cache state and manage provider lifecycle (mount, effects, cleanup)
- **Context building**: Wire up all cache dependencies into a cohesive context
- **Mutation coordination**: Orchestrate create/update/delete operations across cache subsystems
- **Optimistic updates**: Track and manage optimistic changes before server confirmation
- **Operation callbacks**: Provide lifecycle hooks for queries, mutations, navigation, and hierarchy operations
- **Cross-subsystem coordination**: Bridge between State, Handlers, Services, and Sync subsystems

## Key Concepts

### Lifecycle Phases
1. **Initialization**: Initialize cache state and setup provider (_provider/)
2. **Context Building**: Wire up all dependencies (_coordinators/context-builder.ts)
3. **Operation**: Execute queries, mutations, navigation (_callbacks/)
4. **Coordination**: Coordinate multi-step operations (_coordinators/mutation-coordinator.ts)
5. **Optimistic**: Track pending changes (_coordinators/optimistic-tracker.ts)
6. **Sync**: Persist and sync with server (_operations/sync-operations.ts)

### Mutation Lifecycle
```
User Action → Optimistic Update → Dispatch to Cache → API Call → Server Response → Finalize/Rollback
```

The MutationCoordinator manages this entire flow, ensuring:
- UI updates immediately (optimistic)
- Changes persist to localStorage
- Server is notified
- Rollback on failure

### Real-time Tile Mutation Handling

The cache subscribes to tile mutation events from external sources (e.g., agent execution via MCP):
```
External Mutation → Event Bus → Tile Mutation Handler → Fetch/Delete → Cache Update
```

Event types handled:
- `map.tile_created`: Fetches the new tile and adds it to cache
- `map.tile_updated`: Fetches the updated tile and refreshes cache
- `map.tile_deleted`: Removes the tile from cache immediately

Only events from external sources (like `agentic`) are processed to avoid double-handling events already managed by the MutationCoordinator.

## Public API

**Note:** This subsystem is NOT part of the public Cache API. It's used internally by:
- `~/app/map/Cache/provider.tsx`
- `~/app/map/Cache/use-map-cache.ts`

Exports from `index.ts`:
```typescript
// Provider Lifecycle
useInitialCacheState(...)
useCacheLifecycle(...)

// Coordinators
useCacheContextBuilder(...)
useDataOperationsWrapper(...)
useMutationOperations(...)

// Callbacks
createQueryCallbacks(...)
createMutationCallbacks(...)
createNavigationCallbacks(...)
createHierarchyCallbacks(...)

// Operations
createSyncOperationsAPI(...)
```

## Internal Structure

- **`_provider/`**: Provider initialization and lifecycle management
  - `state-initialization.ts`: Initialize cache state with proper remount handling
  - `lifecycle-effects.ts`: Manage provider lifecycle (init, effects, cleanup, sync)
  - `_internals/`: Provider-specific helpers
    - `center-change-handler.ts`: Handle center changes and deferred prefetching
    - `drag-handlers.ts`: Drag-and-drop operation handlers
    - `prefetch-operations.ts`: Background prefetch operations
    - `tile-mutation-handler.ts`: Handle real-time tile mutations from external sources (e.g., agent execution)

- **`MutationCoordinator/`**: Mutation operation coordination (subsystem)
  - See [MutationCoordinator/README.md](./MutationCoordinator/README.md)
  - Orchestrates mutations with optimistic updates and rollback

- **Root utilities**: Small coordination utilities
  - `context-builder.ts`: Build complete cache context for provider
  - `data-operations-wrapper.ts`: Wrap data operations with additional behavior

- **`_callbacks/`**: Lifecycle callback implementations
  - `query-callbacks.ts`: Query operation lifecycle hooks
  - `mutation-callbacks.ts`: Mutation operation lifecycle hooks
  - `navigation-callbacks.ts`: Navigation operation lifecycle hooks
  - `hierarchy-callbacks.ts`: Hierarchy operation lifecycle hooks

- **`_operations/`**: Shared operation utilities
  - `sync-operations.ts`: Sync operation utilities and helpers

## Dependencies

- **Cache State**: For state management and actions
- **Cache Handlers**: For data loading and navigation
- **Cache Services**: For server communication and storage
- **Cache Sync**: For sync operation types
- **Mapping domain**: For coordinate and item utilities
- **tRPC**: For API calls
