# Architecture: Mapping Domain

## Overview
See [README.md](./README.md) for why this domain exists.

## Internal Structure

```
mapping/
├── interface.ts              # Public API
├── dependencies.json         # Allowed imports
├── README.md                # Domain purpose
├── ARCHITECTURE.md          # This file
├── _objects/                # Domain entities (internal)
│   ├── base-item.ts        # Base content entity
│   ├── map-item.ts         # Hexagonal map item entity
│   └── index.ts            # Entity exports
├── _repositories/           # Repository interfaces (internal)
│   ├── base-item.ts        # BaseItemRepository interface
│   ├── map-item.ts         # MapItemRepository interface
│   └── index.ts            # Interface exports
├── _actions/               # Domain actions (internal)
│   ├── map-item.actions.ts # Item-specific operations
│   ├── map-item-actions/   # Complex action orchestrators
│   │   ├── move-orchestrator.ts     # Item movement logic
│   │   └── validation-strategy.ts   # Movement validation
│   └── [helper files]      # Action helpers
├── infrastructure/         # External system adapters
│   ├── base-item/         # Base item persistence
│   ├── map-item/          # Map item persistence
│   │   └── queries/       # Specialized query objects
│   └── transaction-manager.ts  # Transaction coordination
├── services/              # Domain services
│   ├── mapping.service.ts       # Main orchestrator service
│   ├── _item-crud.service.ts    # CRUD operations
│   ├── _item-management.service.ts  # Complex item operations
│   ├── _item-query.service.ts   # Query operations
│   ├── _map-management.service.ts   # Map-level operations
│   └── _mapping-utils.ts        # Utility functions
├── types/                 # Domain types
│   ├── constants.ts      # Domain constants (item types, etc.)
│   ├── contracts.ts      # API contracts
│   ├── errors.ts         # Domain-specific errors
│   └── transaction.ts    # Transaction types
└── utils/                 # Domain utilities
    ├── hex-coordinates.ts # Hexagonal coordinate system
    └── validation.ts      # Domain validation rules
```

## Key Patterns
- **Domain-Driven Design**: Clear separation between domain logic and infrastructure
- **Repository Pattern**: Abstract data access through interfaces
- **Service Layer**: Orchestrates complex operations across multiple aggregates
- **Hexagonal Architecture**: Six-neighbor coordinate system at the core
- **Transaction Pattern**: Ensures consistency for complex operations
- **Query Object Pattern**: Specialized queries separated from repositories

## Dependencies

| Dependency | Purpose |
|------------|---------|
| drizzle-orm | Database operations (via infrastructure) |
| ~/server/db | Database connection |
| ~/lib/utils | Generic repository utilities |
| zod | Input validation for actions |

## Interactions

### Inbound (Who uses this domain)
- **App Layer (map pages)** → Uses services and actions
- **tRPC API** → Uses MappingService via middleware
- **Agentic domain** → May query map state for AI operations

### Outbound (What this domain uses)
- **infrastructure subsystem** ← For data persistence
- **IAM domain** ← For user identity in map ownership
- **Database** ← Via infrastructure repositories

## TO BE IMPROVED
- Consider event sourcing for map history/undo functionality
- Optimize neighbor queries for large maps
- Add caching layer for frequently accessed maps
- Implement real-time collaboration features
- Add map templates and cloning functionality