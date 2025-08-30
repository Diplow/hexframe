# MapResolver Architecture

## Purpose
Resolves map identifiers (database IDs or coordinates) to actual coordinates with optimized caching. Provides a single source of truth for map coordinate resolution.

## Design Principles
- **Single Source of Truth**: Centralized resolution logic prevents inconsistency
- **Performance First**: Built-in caching and memoization prevent unnecessary operations
- **Zero Coupling**: Minimal dependencies enable clean testing and maintenance

## Architectural Position
```
┌─────────────────┐
│ PageOrchestrator│
└─────────────────┘
         │
┌─────────────────┐
│  MapResolver    │ ← **This subsystem**
└─────────────────┘
         │
┌─────────────────┐
│    tRPC API     │ ← Only external dependency
└─────────────────┘
```

## Internal Structure

### Provider Layer
- **provider.tsx**: React context provider for resolution state
- **use-map-resolver.ts**: Hook interface for consumers

### Service Layer  
- **resolver-service.ts**: Core resolution logic and caching

### Type System
- **types.ts**: Resolution state and result types

### Data Flow
1. Consumer calls `useMapResolver(centerParam)`
2. Hook checks internal cache for existing resolution
3. If not cached, triggers tRPC resolution query
4. Service resolves ID → coordinates using backend
5. Result cached and returned to consumer

## Boundary Rules

### Inbound Dependencies
- **PageOrchestrator**: Primary consumer of resolution services
- **Map components**: Secondary consumers needing coordinate data

### Outbound Dependencies
- **tRPC Client**: For backend resolution queries (`~/commons/trpc/react`)
- **React**: For context and hooks (`react`)

### Forbidden Dependencies
- **Direct database access**: Must use tRPC layer
- **Other map subsystems**: Maintains strict isolation
- **Domain logic**: Pure resolution service, no business rules

## Performance Characteristics
- **Resolution Caching**: Same ID cached indefinitely (map coordinates are immutable)
- **Memoized Results**: React-level optimization prevents re-renders
- **Single Query Pattern**: One tRPC call per unique resolution
- **Expected Re-renders**: 1-2 per unique resolution request

## Error Handling
- **Network failures**: Graceful degradation with error state
- **Invalid IDs**: Clear error messaging for debugging
- **Loading states**: Proper loading indicators during resolution

## Testing Strategy
- **Unit**: Mock tRPC for service testing