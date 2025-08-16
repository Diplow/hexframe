# Architecture: Map Router

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
map/
├── interface.ts            # Public API
├── dependencies.json       # Allowed imports
├── README.md              # Subsystem purpose
├── ARCHITECTURE.md        # This file
├── map.ts                 # Main router aggregator
├── map-items.ts           # Item-specific endpoints
├── map-user.ts            # User map management endpoints
├── map-schemas.ts         # Zod validation schemas
└── _map-auth-helpers.ts   # Authorization utilities
```

## Key Patterns
- **Router Composition**: Main router aggregates user and items sub-routers
- **Schema Validation**: Centralized Zod schemas for input validation
- **Helper Functions**: Shared auth utilities prefixed with underscore
- **Backward Compatibility**: Legacy flat endpoints delegate to nested routers

## Dependencies

| Dependency | Purpose |
|------------|---------|
| zod | Input validation |
| @trpc/server | tRPC framework |
| ~/server/api/trpc | tRPC configuration and procedures |
| ~/server/api/types/contracts | API contract adapters |
| ~/lib/domains/mapping/interface | Mapping domain services |

## Interactions

### Inbound (Who uses this subsystem)
- **Frontend Map Components** → Call map operations
- **tRPC Client** → Makes typed API calls
- **Root Router** → Mounts this router

### Outbound (What this subsystem uses)
- **Mapping Domain** ← For business logic
- **tRPC Middleware** ← For auth and service injection
- **Contract Adapters** ← For response transformation

## TO BE IMPROVED
- Consider splitting into smaller routers if complexity grows
- Add batch operations for performance
- Implement optimistic locking for concurrent edits