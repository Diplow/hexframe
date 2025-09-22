# Services Architecture

## Design Principles

The Services subsystem follows these architectural patterns:

### Single Responsibility
Each service handles one core concern:
- **EventBus**: Inter-component communication
- **PreFetch**: Data loading and caching
- **DragAndDrop**: DOM-based user interactions

### Dependency Direction
Services layer sits between UI components and external dependencies:
```
UI Components → Services → External APIs/DOM
```

### Subsystem Boundaries
- Services import from `~/app/map/types` for shared types
- Services can access global contexts and server APIs
- UI components consume services through clean interfaces

## Service Patterns

### EventBus Pattern
Implements pub/sub pattern for decoupled communication:
- Context-based provider/consumer pattern
- Type-safe event definitions
- Prevents tight coupling between components

### PreFetch Pattern
Optimistic data loading with caching:
- Transform API data to tile format
- localStorage-based persistence
- Graceful fallback to API calls

### DragAndDrop Pattern
DOM-based interaction system:
- Geometry-aware tile registration
- Event delegation for performance
- State management for drag operations

## Dependencies

Allowed external dependencies per `dependencies.json`:
- `~/contexts/UnifiedAuthContext` - Authentication state
- `~/lib/debug/debug-logger` - Logging infrastructure
- `~/server/api` - Backend communication
- `~/app/map/types` - Shared type definitions

## Rule of 6 Compliance

Each service follows the Rule of 6:
- Max 6 exported functions per service
- Max 6 parameters per function (prefer objects)
- Max 6 subsystems per directory