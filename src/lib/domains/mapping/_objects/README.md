# Mapping Objects Domain

## Mental Model
This subsystem is the "entity layer" of the mapping domain - defining the core domain objects (MapItem, BaseItem) and their validation rules, similar to how ORM models define database entities and their business logic constraints.

## Responsibilities
- Define MapItem entity with coordinates, type, and hierarchical relationships
- Define BaseItem entity representing the underlying content of map items
- Define BaseItemVersion type for version history snapshots (read-only value object)
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
- `BaseItemVersion`: Type for version history snapshots (immutable records)
- `MapItemValidation`: Validates coordinates and parent-child relationships
- `MapItemNeighborValidation`: Validates neighbor relationships and direction constraints
- `MapItemType`: Enum for built-in item types (USER, ORGANIZATIONAL, CONTEXT, SYSTEM)
- `NonUserMapItemTypeString`: String literal type for API contracts
- Types: `MapItemWithId`, `BaseItemWithId`, `MapItemAttrs`, etc.

## Item Type System

### Built-in Types (MapItemType enum)
The `MapItemType` enum defines the standard semantic tile types:
- **USER**: Root tile for each user's map (system-controlled, cannot be created via API)
- **ORGANIZATIONAL**: Structural grouping tiles for navigation and categorization
- **CONTEXT**: Reference material tiles to explore on-demand (default for new tiles)
- **SYSTEM**: Executable capability tiles that can be invoked like a skill

### Custom Item Types
Beyond built-in types, the system supports arbitrary string values as custom item types. This enables users to define their own semantic classifications like "template", "project", or "workflow".

**Type utilities** (in `infrastructure/map-item/item-type-utils.ts`):
- `isBuiltInItemType(value)`: Type guard checking if value is a MapItemType enum value
- `isReservedItemType(value)`: Check if type is reserved (currently only "user")
- `isCustomItemType(value)`: Check if type is a valid custom (non-built-in) string

### Reserved Type Names
The following type names are reserved and cannot be used for custom types:
- `user` - Reserved for system-created root tiles

### API String Types
For external API contracts, use string literal types:
- `NonUserMapItemTypeString`: `"organizational" | "context" | "system"`
- `VisibilityString`: `"public" | "private"`

### Backward Compatibility
- Existing enum values remain stable (stored in database)
- Code using `MapItemType` enum continues to work unchanged
- Custom types are additive - they don't break existing functionality

**Dependencies**: See parent's `dependencies.json` for allowed imports.

**Note**: Child subsystems can access internals. Sibling and parent subsystems must use `index.ts` exports only. The `pnpm check:architecture` tool enforces this boundary.

## Key Validation Rules
- **Neighbor Count**: Max 6 structural children (directions 1-6) OR max 7 children when one is direction 0 (composition)
- **Direction Uniqueness**: Each child must have a unique direction from its parent
- **Parent-Child Types**: USER items cannot have parents; BASE items must have parents
- **Coordinate Consistency**: Children's coordinates must match parent's userId/groupId
- **Depth Consistency**: Child depth must be exactly parent depth + 1

## Design Decisions

### BaseItemVersion: Repository-Level Type
`BaseItemVersion` is defined as a simple type (not a full domain entity) because:
- Versions are purely read-only historical snapshots with no business logic
- No version comparison, rollback validation, or other domain operations exist yet
- Validation happens at repository layer (sequential version numbers, uniqueness)
- Following YAGNI principle: avoid premature complexity

**Future considerations**: If business logic emerges (e.g., version comparison, rollback validation, computed properties), convert to full domain entity with factory functions and methods.
