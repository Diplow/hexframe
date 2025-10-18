# Mapping Objects Domain

## Mental Model
This subsystem is the "entity layer" of the mapping domain - defining the core domain objects (MapItem, BaseItem) and their validation rules, similar to how ORM models define database entities and their business logic constraints.

## Responsibilities
- Define MapItem entity with coordinates, type, and hierarchical relationships
- Define BaseItem entity representing the underlying content of map items
- Validate map item structure and relationships (parent-child hierarchy)
- Validate neighbor relationships including direction 0 (composition) children
- Enforce business rules: USER items have no parent, BASE items must have parent
- Support up to 7 children per item when one is direction 0 (composition)
- Ensure unique directions among children (no duplicate directions)

## Non-Responsibilities
- Database persistence and queries → See `~/lib/domains/mapping/infrastructure/README.md`
- Hexagonal coordinate calculations → See `~/lib/domains/mapping/utils/README.md`
- Complex item operations (move, swap) → See `~/lib/domains/mapping/_actions/README.md`
- Domain services and orchestration → See `~/lib/domains/mapping/services/README.md`
- API endpoints and tRPC routers → See `~/server/api/routers/map/README.md`
- UI rendering and components → See `~/app/map/README.md`

## Interface
**Exports**: See `index.ts` for the complete public API. Key exports:
- `MapItem`: Main domain entity for map items
- `BaseItem`: Entity representing underlying content
- `MapItemValidation`: Validates coordinates and parent-child relationships
- `MapItemNeighborValidation`: Validates neighbor relationships and direction constraints
- `MapItemType`: Enum for item types (USER, BASE)
- Types: `MapItemWithId`, `BaseItemWithId`, `MapItemAttrs`, etc.

**Dependencies**: See parent's `dependencies.json` for allowed imports.

**Note**: Child subsystems can access internals. Sibling and parent subsystems must use `index.ts` exports only. The `pnpm check:architecture` tool enforces this boundary.

## Key Validation Rules
- **Neighbor Count**: Max 6 structural children (directions 1-6) OR max 7 children when one is direction 0 (composition)
- **Direction Uniqueness**: Each child must have a unique direction from its parent
- **Parent-Child Types**: USER items cannot have parents; BASE items must have parents
- **Coordinate Consistency**: Children's coordinates must match parent's userId/groupId
- **Depth Consistency**: Child depth must be exactly parent depth + 1
