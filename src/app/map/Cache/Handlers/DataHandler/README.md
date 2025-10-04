# DataHandler

## Mental Model

The DataHandler is responsible for **loading and caching tile data** from the server. It acts as the bridge between the Cache system and the backend API, managing data fetching, dispatching, and cache invalidation.

## Responsibilities

- **Load regions**: Fetch tiles for a specific coordinate and depth
- **Load children**: Fetch child tiles for a parent item
- **Prefetch**: Silently load data in the background for performance
- **Invalidate cache**: Clear stale or outdated cached data
- **Manage loading states**: Dispatch loading and error states to the cache

## Key Concepts

### Services
DataHandler uses a `services` object to abstract the server communication:
- Allows for different implementations (tRPC, mock services, etc.)
- Enables easier testing by injecting mock services

### Action Types
Different loading operations trigger different cache actions:
- `loadRegion`: Initial region load with loading states
- `loadItemChildren`: Expand operation load
- `Prefetch`: Silent background load without loading indicators

## Public API

```typescript
createDataHandler(config: DataHandlerConfig): DataOperations
createDataHandlerWithServerService(...): DataOperations
createDataHandlerWithTRPC(...): DataOperations // deprecated
```

## Internal Structure

- `data-handler.ts`: Main implementation
- `_factories/`: Factory functions for creating handlers with different service configurations
- `_helpers/`: Helper functions for fetching, dispatching, and validation logic

## Dependencies

- Cache State: For dispatching actions and reading cache config
- Cache Services: For server communication
- Mapping domain: For coordinate validation and parsing
