# Cache Handlers Subsystem

## Purpose

Handles different types of cache operations with complex business logic:
- **Data Handler**: Manages fetching and loading data from server
- **Navigation Handler**: Manages center changes, expansion, and navigation state
- **Mutation Handler**: Handles create, update, delete operations with optimistic updates
- **Ancestor Loader**: Specialized loading for parent hierarchy chains

## Architecture

### Key Components
- `data-handler.ts` - Server data fetching and cache population
- `navigation-handler.ts` - Navigation state management and transitions  
- `mutation-handler.ts` - CRUD operations with optimistic updates and rollback
- `ancestor-loader.ts` - Hierarchical parent chain loading
- `types.ts` - Shared type definitions for handler interfaces

### Dependencies
- State layer for dispatching actions and reading current state
- Services layer for server communication and storage
- Domain utilities for coordinate system operations

## Usage

Handlers are created and managed by the main cache provider. They expose operation interfaces that the main hook (`useMapCache`) presents to consumers.

```typescript
// Example usage through useMapCache
const { navigateToCoord, updateItem, loadMore } = useMapCache();
```

## Testing

Each handler has comprehensive test coverage in `__tests__/` covering:
- Normal operation flows
- Error conditions and recovery
- Optimistic update behavior
- State consistency