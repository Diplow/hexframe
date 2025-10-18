# Cache Actions Subsystem

## Mental Model

The Actions subsystem is the "command factory" for the cache state - it creates plain objects that describe state changes without actually changing state. Like Redux action creators or command objects in CQRS, these are pure functions that produce structured instructions for the reducer.

## Responsibilities

- Create action objects for cache data operations (load, update, remove)
- Create action objects for navigation state changes (center, expansion)
- Create action objects for composition expansion state (toggle, set, clear)
- Create action objects for system operations (loading, errors, invalidation)
- Provide validated action creators with runtime checks
- Provide helper functions for creating batch operations
- Export all action creators via public API
- Ensure all actions conform to `CacheAction` type union

## Non-Responsibilities

- State mutation or modification → See `../_reducers/README.md`
- Action type definitions → See `../types.ts` (ACTION_TYPES constant)
- State type definitions → See `../types.ts` (CacheState interface)
- Dispatching actions to state → See `~/app/map/Cache/README.md` (React integration)
- Data fetching or API calls → See `~/app/map/Cache/Services/README.md`
- State queries or selectors → See `../selectors/README.md`

## Interface

**Exports**: See `index.ts` - this is the ONLY file other subsystems should import from.

### Data Actions (data.ts)
- `loadRegion(items, centerCoordId, maxDepth)`: Load region data into cache
- `loadItemChildren(items, parentCoordId, maxDepth)`: Load children for specific item
- `updateItems(itemsById)`: Update multiple items at once
- `removeItem(coordId)`: Remove single item from cache
- `createLoadRegionAction(payload)`: Validated version with runtime checks
- `createLoadItemChildrenAction(payload)`: Validated version with runtime checks

### Navigation Actions (navigation.ts)
- `setCenter(centerCoordId)`: Set current center for navigation
- `setExpandedItems(expandedItemIds)`: Set all expanded items at once
- `toggleItemExpansion(itemId)`: Toggle expansion state for single item
- `createSetCenterAction(centerCoordId)`: Validated version with runtime checks

### Composition Actions (composition.ts)
- `toggleCompositionExpansion(coordId)`: Toggle composition view for a tile
- `setCompositionExpansion(coordId, isExpanded)`: Set composition state explicitly
- `clearCompositionExpansions()`: Clear all composition expansions

### System Actions (system.ts)
- `setLoading(isLoading)`: Set loading state
- `setError(error)`: Set error state
- `invalidateRegion(regionKey)`: Mark region as stale
- `invalidateAll()`: Mark all regions as stale
- `updateCacheConfig(config)`: Update cache configuration
- `createOptimisticUpdateActions(coordId, item)`: Generate optimistic update batch
- `createErrorHandlingActions(error)`: Generate error handling batch
- `createBatchActions(...actions)`: Filter and combine multiple actions

### Grouped Actions
- `cacheActions`: Object containing all action creators for convenient access

**Action Structure**: All actions follow the Flux Standard Action pattern:
```typescript
{
  type: string,           // From ACTION_TYPES constant
  payload?: any,          // Optional payload data
}
```

**Dependencies**: This subsystem imports only from parent `../types.ts` for type definitions. No dependencies.json needed.

**Note**: Parent State subsystem can import these actions freely. All other subsystems MUST use the public exports in `index.ts`. The `pnpm check:architecture` tool enforces this boundary.
