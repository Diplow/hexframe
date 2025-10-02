# Mapping Infrastructure

## Mental Model
Like a specialized database driver that translates between domain objects (MapItem, BaseItem) and PostgreSQL tables, ensuring atomic operations and maintaining hexagonal coordinate relationships.

## Responsibilities
- Implement repository interfaces defined in `_repositories` with concrete database operations
- Translate between domain entities and database row models using mappers
- Coordinate database transactions for atomic multi-table operations
- Compose and optimize complex queries for hexagonal map hierarchies
- Manage database connections and transaction contexts

## Non-Responsibilities
- Business logic and domain rules → See `../services/README.md`
- Domain entity behavior and validation → See `../_objects/README.md`
- Repository interface definitions → See `../_repositories/README.md`
- Hexagonal coordinate calculations → See `../utils/README.md`
- Base item database operations → See `./base-item/README.md`
- Map item database operations → See `./map-item/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.