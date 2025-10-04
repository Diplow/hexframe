# NavigationHandler

## Mental Model

The NavigationHandler orchestrates **user navigation through the hexagonal map**. It coordinates data loading, state updates, URL synchronization, and UI feedback to provide a seamless navigation experience.

## Responsibilities

- **Execute navigation**: Navigate to specific tiles with proper state updates
- **URL synchronization**: Keep browser URL in sync with map state
- **Expansion management**: Toggle tile expansion and manage expanded state
- **Prefetching**: Load adjacent regions for smooth navigation
- **Ancestor validation**: Ensure navigation targets have complete ancestor chains
- **Event coordination**: Emit navigation events for UI feedback

## Key Concepts

### Navigation Flow
1. User clicks/navigates to a tile
2. Validate target exists and has ancestors
3. Load missing data if needed
4. Update center and expanded state
5. Update URL
6. Emit navigation events
7. Prefetch adjacent regions

### Navigation Options
- `skipURLUpdate`: Don't update browser URL (for programmatic navigation)
- `skipPrefetch`: Don't prefetch adjacent regions
- `source`: Track navigation source for analytics/debugging

### Dependencies Injection
NavigationHandler uses dependency injection for testability:
- `router`: Browser routing (Next.js router or mock)
- `searchParams` / `pathname`: URL state
- `dataHandler`: For loading data
- `serverService`: For server operations
- `eventBus`: For event emission

## Public API

```typescript
createNavigationHandler(config: NavigationHandlerConfig): NavigationOperations
useNavigationHandler(...): NavigationOperations
```

## Internal Structure

- `navigation-handler.ts`: Main implementation and public API
- `_core/`: Core navigation logic and operations
  - `navigation-core.ts`: Main navigation execution logic
  - `navigation-operations.ts`: Navigation helper operations
- `_helpers/`: Helper functions for dependencies, events, and utilities
- `_url/`: URL synchronization and management
- `navigation-*.ts`: Additional navigation utilities (resolution, state updates, etc.)

## Dependencies

- Cache State: For reading/updating navigation state
- DataHandler: For loading tile data
- Cache Services: For server operations
- Event Bus: For navigation event emission
- Next.js Router: For URL management
