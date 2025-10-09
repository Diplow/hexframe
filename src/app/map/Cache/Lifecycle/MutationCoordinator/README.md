# MutationCoordinator

## Mental Model

The MutationCoordinator orchestrates the complete lifecycle of mutation operations (create, update, delete) across the Cache system. It ensures UI responsiveness through optimistic updates while maintaining data consistency with the server.

## Responsibilities

- **Coordinate mutations**: Orchestrate create, update, delete operations across cache subsystems
- **Optimistic updates**: Apply changes immediately to UI before server confirmation
- **State synchronization**: Keep Cache State, localStorage, and server in sync
- **Rollback handling**: Revert optimistic changes if server operations fail
- **Event emission**: Notify other systems of mutation lifecycle events

## Key Concepts

### Mutation Lifecycle
```
User Action
  ↓
Optimistic Update (immediate UI update)
  ↓
Dispatch to Cache State
  ↓
Persist to localStorage
  ↓
API Call to Server
  ↓
Server Response
  ↓
Finalize (success) or Rollback (failure)
```

### Optimistic Updates
The system applies changes immediately for responsive UI, then confirms with the server. If the server rejects the change, the optimistic update is rolled back.

## Internal Structure

- **`mutation-coordinator.ts`** (787 lines): Main coordination logic
  - Orchestrates the full mutation lifecycle
  - Coordinates between State, Handlers, Services, and Storage
  - Manages optimistic update flow and rollback

- **`optimistic-tracker.ts`**: Tracks pending optimistic changes
  - Maintains map of in-flight mutations
  - Enables rollback by tracking original state
  - Provides status of pending operations

- **`use-mutation-operations.ts`**: React hook wrapper
  - Exposes mutation operations to React components
  - Manages React-specific lifecycle
  - Provides convenient API for UI mutations

## Public API

Exported via `~/app/map/Cache/Lifecycle`:

```typescript
useMutationOperations(config): MutationOperations
```

Returns mutation operations:
- `createItem()`
- `updateItem()`
- `deleteItem()`
- `swapItems()`

## Dependencies

- **Cache State**: For dispatching actions
- **Cache Handlers**: For navigation after mutations
- **Cache Services**: For server API calls and localStorage
- **Mapping domain**: For coordinate utilities
