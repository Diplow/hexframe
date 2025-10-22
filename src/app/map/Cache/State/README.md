# Cache State Subsystem

## Mental Model

The Cache State is the "frontend database schema" - it defines the shape of data stored in memory and the operations (actions) that can modify it. Like a relational database has tables, columns, and stored procedures, this subsystem has state types, action types, and reducers.

## Responsibilities

- Define complete cache state structure via `CacheState` interface
- Define all action types and payloads for cache operations via `CacheAction` union
- Provide action type constants via `ACTION_TYPES` for type-safe action creation
- Export initial state configuration via `initialCacheState`
- Track regular tile expansion state via `expandedItemIds: string[]`
- Track composition expansion state via `isCompositionExpanded: boolean`
- Handle composition state updates via reducer handlers:
  - `handleToggleCompositionExpansion`: Toggle the boolean flag
  - `handleSetCompositionExpansion`: Explicitly set the boolean flag
- Provide pure reducer function via `cacheReducer` for state transitions
- Export action creators for all cache operations (including composition actions)
- Export selectors for derived state queries

## Non-Responsibilities

- Action creator implementation → See `./actions/README.md`
- Reducer implementation details → See `./_reducers/README.md`
- Selector implementation and memoization → See `./selectors/README.md`
- Test implementations → See `./__tests__/`
- React integration and hooks → See `~/app/map/Cache/README.md`
- Data fetching and API calls → See `~/app/map/Cache/Services/README.md`
- Lifecycle orchestration → See `~/app/map/Cache/Lifecycle/README.md`

## Interface

**Exports**: See `index.ts` - this is the ONLY file other subsystems should import from.

Key exports:
- **Types**: `CacheState`, `CacheAction`, `ACTION_TYPES`, payload types
- **Reducer**: `cacheReducer`, `initialCacheState`
- **Actions**:
  - Navigation: `setCenter`, `toggleItemExpansion`, `setExpandedItems`
  - Composition: `toggleCompositionExpansion`, `setCompositionExpansion`
  - Data: `loadRegion`, `loadItemChildren`, `updateItems`, `removeItem`
  - System: `setLoading`, `setError`, `invalidateRegion`, `invalidateAll`
- **Selectors**: `cacheSelectors`, region queries, optimization helpers

**State Structure**:
```typescript
interface CacheState {
  itemsById: Record<string, TileData>;      // Tile data indexed by coordId
  regionMetadata: Record<string, RegionMetadata>;
  currentCenter: string | null;
  expandedItemIds: string[];                // Tiles with all 6 children visible
  isCompositionExpanded: boolean;           // Global composition view toggle
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number;
  cacheConfig: {...};
}
```

**Dependencies**: See `dependencies.json` for allowed imports. The State subsystem can import from:
- `vitest` (for testing)
- `~/app/map/types` (for tile data types)
- `~/server/api` (for API contract types)
- `~/lib/domains/mapping` (for coordinate utilities)

**Note**: Child subsystems (actions, _reducers, selectors) can import from this subsystem freely (including types.ts directly). All other subsystems MUST use the public exports in `index.ts`. The `pnpm check:architecture` tool enforces this boundary.
