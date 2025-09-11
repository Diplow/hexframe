# State Subsystem Architecture

## Architectural Principles

### Pure State Management
- **Immutable Updates**: All state changes create new objects, never mutate existing state
- **Predictable Transitions**: Actions clearly describe what happened, reducers describe how state changes
- **Type Safety**: Full TypeScript coverage prevents runtime state errors
- **Single Source of Truth**: All cache state flows through this central reducer

### Redux-Style Pattern
```typescript
// Action -> Reducer -> New State -> Selectors -> Derived Data
dispatch(loadRegion(params)) -> reducer -> newState -> selectors(newState) -> viewData
```

### Separation of Concerns
- **Types**: Pure type definitions with no business logic
- **Actions**: Action creation with payload validation
- **Reducer**: State transition logic only
- **Selectors**: Derived state computations with memoization

## Design Patterns

### Action Creator Pattern
```typescript
export const loadRegion = (payload: LoadRegionPayload): CacheAction => ({
  type: ACTION_TYPES.LOAD_REGION,
  payload,
  timestamp: Date.now()
});
```

### Selector Pattern with Memoization
```typescript
export const cacheSelectors = (state: CacheState) => ({
  getItemById: (id: string) => state.itemsById[id] ?? null,
  getVisibleItems: memoize(() => /* expensive computation */),
  isLoading: (region: string) => state.loading[region] ?? false
});
```

### Normalized State Shape
- Items stored by ID for O(1) lookups
- Relationships maintained through references
- Loading and error states tracked separately

## State Management Strategy

### Loading States
- Track loading per region/operation to enable granular UI feedback
- Support concurrent operations without conflicts
- Clear loading states on completion or error

### Error Handling
- Errors stored by operation/region key
- Non-blocking errors allow partial functionality
- Error recovery through retry mechanisms

### Performance Optimizations
- Memoized selectors prevent unnecessary recalculations
- Normalized state shape minimizes update impact
- Batch updates where possible to reduce re-renders

## Memory Management

### State Cleanup
- Remove stale data when regions become inactive
- Clear error states after successful retries
- Limit expansion state to prevent unbounded growth

### Selector Efficiency
- Use memoization for expensive computations
- Minimize object creation in selectors
- Return stable references when data hasn't changed