# Mapping Infrastructure

## Why This Exists
This subsystem provides concrete implementations of repository interfaces for the mapping domain, handling all database operations for map items and base items. It bridges the domain layer with the PostgreSQL database through Drizzle ORM.

## Mental Model
Database adapters that translate between domain models and PostgreSQL storage, handling complex hexagonal relationships and transactional operations.

## Core Responsibility
This subsystem owns:
- Repository implementations for map items and base items
- Database query optimization and composition
- Transaction management for atomic operations
- Domain-to-database model translation

This subsystem does NOT own:
- Business logic (delegated to services)
- Domain entity behavior (delegated to objects)
- Repository interfaces (owned by _repositories)
- Hexagonal coordinate logic (delegated to utils)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `DbMapItemRepository` - Database implementation for map item operations
- `DbBaseItemRepository` - Database implementation for base item operations
- `TransactionManager` - Transaction coordination for atomic operations

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.