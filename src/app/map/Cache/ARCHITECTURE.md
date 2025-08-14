# Architecture: Cache

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
Cache/
├── interface.ts       # Public API
├── dependencies.json  # Allowed imports
├── State/            # Pure reducer-based state management
│   ├── actions.ts
│   ├── reducer.ts
│   ├── selectors.ts
│   └── types.ts
├── Handlers/         # Coordination logic between state and services
│   ├── data-handler.ts
│   ├── mutation-handler.ts
│   ├── navigation-handler.ts
│   ├── ancestor-loader.ts
│   └── types.ts
├── Services/         # External integrations (server, storage)
│   ├── server-service.ts
│   ├── storage-service.ts
│   └── types.ts
├── Sync/            # Background synchronization
│   ├── sync-engine.ts
│   └── types.ts
├── _coordinators/   # Internal coordination utilities
├── _lifecycle/      # Provider lifecycle management
├── _builders/       # Context building utilities
├── provider.tsx     # Base provider component
├── use-map-cache.ts # Main hook for cache operations
└── types.ts         # Main subsystem types
```

## Key Patterns
- **Layered Architecture**: State → Handlers → Services pattern for separation of concerns
- **Optimistic Updates**: Immediate UI updates with rollback capability
- **Region-Based Caching**: Data organized by coordinate IDs for efficient loading
- **Hook-Based API**: Single main hook (useMapCache) provides all cache operations
- **Event Emission**: Notifications about completed operations via event bus

## Dependencies

| Dependency | Purpose |
|------------|---------|
| react | Core hooks (useContext, useEffect, useCallback, etc.) |
| next/navigation | URL synchronization (useRouter, useSearchParams) |
| ~/commons/trpc | Server communication via tRPC hooks (both react and server) |
| ~/lib/domains/mapping/utils | Coordinate system utilities (hex-coordinates) |
| ~/server/api/types/contracts | API contract types for data structures |
| ~/app/map/types | Tile data types and event bus interface |
| ~/lib/debug/debug-logger | Debug logging utilities |
| ~/test-utils/event-bus | Mock event bus for testing only |
| vitest | Testing framework |

## Interactions

### Inbound (Who uses this subsystem)
- **Canvas** → Uses cache data for rendering tiles
- **Tile components** → Use cache mutations for CRUD operations
- **Hierarchy** → Uses cache data for parent/child relationships
- **Page components** → Use MapCacheProvider for context setup
- **Chat/Agentic services** → Use cache state for AI context
- **Test utilities** → Use mock providers for testing

### Outbound (What this subsystem uses)
- **tRPC API** ← For server communication
- **localStorage** ← For persistent storage
- **Next.js router** ← For URL synchronization
- **Event bus** ← For cross-system notifications (interface from app/map/types)
- **Hex coordinate system** ← For spatial calculations

## TO BE IMPROVED
- **Complex internal structure**: 40+ TypeScript files with deep nesting may indicate over-engineering
- **Mixed concerns in index.tsx**: Should be deleted as interface.ts serves the public API role
- **Test environment conflicts**: React component tests fail due to vitest workspace configuration issues
- **URL state management**: Navigation handler directly manipulates Next.js router, coupling cache to routing framework
- **AI context coupling**: useAIChat currently sends entire CacheState to backend. Should instead send descriptive information (current timeline messages, current center, expanded tiles) and let backend reconstruct context via a service that composes mapping domain (for data) with agentic domain (for context building)