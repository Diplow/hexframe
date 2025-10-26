# Mapping Domain

## Mental Model
Like a hexagonal filing cabinet with built-in version control, where knowledge items are organized in a spatial 7-direction coordinate system (6 neighbors + 1 composition center), creating meaningful relationships between ideas through their physical proximity. Each tile automatically tracks its complete edit history through immutable snapshots, similar to Git commits, allowing you to view and restore any previous state while maintaining the spatial organization through direction 0 composition.

## Responsibilities
- Create and manage hexagonal maps with ROOT (USER) items at the center
- Place and move items within hexagonal coordinate spaces using a 7-direction system (directions 1-6 for neighbors, direction 0 for composition)
- Maintain parent-child hierarchical relationships between map items
- Support tile composition through direction 0 (center) allowing tiles to contain internal structures
- Query and manage composed children (direction 0 descendants) separately from structural neighbors
- Orchestrate complex operations like item movement with automatic descendant updates
- Track complete version history for all tile content changes with immutable snapshots
- Provide version retrieval with pagination support for historical tile states
- Preserve version history integrity across tile moves and updates
- Provide both server-side domain services and client-safe interfaces for map operations

## Non-Responsibilities
- User authentication and identity management → See `~/lib/domains/iam/README.md`
- AI/chat interactions and agentic operations → See `~/lib/domains/agentic/README.md`
- UI rendering logic and client components → See `~/app/map/README.md`
- Complex item operation orchestration → See `./_actions/README.md`
- Database persistence and transaction management → See `./infrastructure/README.md`
- Domain business logic services → See `./services/README.md`
- Hexagonal coordinate system calculations → See `./utils/README.md`
- Domain entity definitions and behavior → See `./_objects/README.md`
- Repository interface definitions → See `./_repositories/README.md`
- Type definitions and contracts → See `./types/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

**Key Services:**
- `MappingService` - Main service orchestrating all mapping operations
- `ItemCrudService` - Create, update, delete, and move tile operations
- `ItemQueryService` - Query tiles and relationships
- `ItemHistoryService` - Version history queries (getItemHistory, getItemVersion)
- `DbMapItemRepository`, `DbBaseItemRepository` - Database persistence layer

**Version History Feature:**
All tile content changes are automatically tracked with immutable version snapshots. Use `ItemHistoryService` to:
- Get complete version history with `getItemHistory(coords, { limit, offset })`
- Retrieve specific versions with `getItemVersion(coords, versionNumber)`
- Version history is preserved across tile moves and always ordered newest-first

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.