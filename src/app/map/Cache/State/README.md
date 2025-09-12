# Cache State Subsystem

## Purpose

Manages the central cache state for the map application using a Redux-style pattern:
- **State Types**: Defines the complete cache state structure and action types
- **Actions**: Action creators for all cache operations
- **Reducer**: Pure functions handling state transitions
- **Selectors**: Derived state computations and data queries

## Architecture

### Key Components
- `types.ts` - State shape, action types, and payload interfaces
- `actions.ts` - Action creator functions for type-safe dispatching
- `reducer.ts` - Pure reducer functions handling state transitions
- `selectors.ts` - Memoized selectors for derived state and queries
- `index.ts` - Public API barrel exports

### State Structure
```typescript
interface CacheState {
  itemsById: Record<string, TileData>;
  center: string | null;
  expandedItems: Set<string>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  // ... other cache state
}
```

### Dependencies
- Domain utilities for coordinate operations
- No direct dependencies on React - pure state management
- Type-safe action patterns throughout

## Usage

State is managed centrally by the cache provider and accessed through selectors:

```typescript
// Accessing state through selectors
const { getItemById, getVisibleItems, isLoading } = cacheSelectors(state);
const item = getItemById('coord-id');
```

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

### Performance Optimizations
- Memoized selectors prevent unnecessary recalculations
- Normalized state shape minimizes update impact
- Batch updates where possible to reduce re-renders
- Selector efficiency with stable references

## Testing

Comprehensive test coverage for:
- Action creators and type safety
- Reducer state transitions and immutability
- Selector computations and memoization
- Error handling and edge cases