# Repository Interfaces

## Mental Model
Repository interfaces are like "job descriptions for data access workers" - they define WHAT operations need to be performed (get, create, update, delete, query versions) without specifying HOW to do them. The infrastructure layer provides the actual workers (DbBaseItemRepository, DbMapItemRepository) who know which tools to use (Drizzle ORM, PostgreSQL).

## Responsibilities
- Define repository interface contracts for BaseItem and MapItem entities
- Specify version history query methods (getVersionHistory, getVersionByNumber, getLatestVersion)
- Extend GenericRepository with domain-specific query capabilities
- Define type-safe method signatures using TypeScript generics
- Ensure consistent repository patterns across all domain entities
- Document expected behavior through method signatures and JSDoc

## Non-Responsibilities
- Actual database queries → See `../infrastructure/README.md`
- Domain entity definitions → See `../_objects/README.md`
- Service-layer business logic → See `../services/README.md`
- Generic repository patterns → See `~/lib/domains/utils/generic-repository.ts`
- Database schema definitions → See `~/server/db/schema/README.md`

## Interface
**Exports**: See `index.ts` for repository interface types:
- `BaseItemRepository`: Interface for BaseItem data access with version query methods
- `MapItemRepository`: Interface for MapItem data access with coordinate-based queries
- `MapItemIdr`: Identifier type for MapItem queries

**Key Methods Added (Version History):**
- `getVersionHistory(baseItemId, options?)`: Query all versions with pagination support
- `getVersionByNumber(baseItemId, versionNumber)`: Retrieve specific version by number
- `getLatestVersion(baseItemId)`: Get most recent version

**Dependencies**: Repository interfaces have no runtime dependencies. They are consumed by:
- Infrastructure implementations: `../infrastructure/base-item/db.ts`, `../infrastructure/map-item/db.ts`
- Service layer: `../services/_item-history.service.ts` (for version queries)

**Design Principle**: Version query methods are specific to BaseItemRepository (not MapItemRepository) because versions track content changes, not coordinate/structural changes. This maintains interface segregation.

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.
