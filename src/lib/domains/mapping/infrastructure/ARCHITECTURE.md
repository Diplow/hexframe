# Architecture: Mapping Infrastructure

## Overview
See [README.md](./README.md) for why this subsystem exists.

## Internal Structure

```
infrastructure/
├── interface.ts           # Public API
├── dependencies.json      # Allowed imports
├── README.md             # Subsystem purpose
├── ARCHITECTURE.md       # This file
├── base-item/            # Base item infrastructure
│   └── db.ts            # Database repository for base items
├── map-item/             # Map item infrastructure
│   ├── README.md        # Map item specific docs
│   ├── db.ts            # Main repository implementation
│   ├── mappers.ts       # Domain-DB model translation
│   ├── types.ts         # Infrastructure types
│   └── queries/         # Query composition
│       ├── read-queries.ts       # SELECT operations
│       ├── write-queries.ts      # INSERT/UPDATE/DELETE operations
│       ├── relation-queries.ts   # Neighbor relationship queries
│       └── specialized-queries.ts # Complex domain-specific queries
└── transaction-manager.ts # Transaction coordination
```

## Key Patterns
- **Repository Pattern**: Implements interfaces defined in _repositories
- **Query Object Pattern**: Separates complex queries into dedicated classes
- **Mapper Pattern**: Translates between domain entities and database models
- **Transaction Pattern**: Ensures atomic operations across multiple tables
- **Composition**: Repository delegates to specialized query objects

## Dependencies

| Dependency | Purpose |
|------------|---------|
| drizzle-orm | ORM for type-safe database operations |
| drizzle-orm/postgres-js | PostgreSQL adapter |
| ~/server/db | Database connection instance |
| ~/server/db/schema | Database schema definitions |
| ../_objects | Domain entities (MapItem, BaseItem) |
| ../_repositories | Repository interfaces to implement |
| ../utils/hex-coordinates | Hexagonal coordinate system |
| ../types | Domain types and constants |

## Interactions

### Inbound (Who uses this subsystem)
- **Mapping Services** → Uses repositories for data operations
- **Mapping Actions** → May instantiate repositories for server actions
- **Transaction contexts** → Repositories can be wrapped in transactions

### Outbound (What this subsystem uses)
- **Database (Drizzle/PostgreSQL)** ← For persistence
- **Domain objects** ← For creating domain entities
- **Hex coordinate utils** ← For path operations

## TO BE IMPROVED
- Consider caching frequently accessed items (root items, user maps)
- Query performance optimization for deep hierarchies
- Better error messages for constraint violations
- Consider implementing bulk operations for better performance