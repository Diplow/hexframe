# Types

## Mental Model

The Types subsystem is the "translation layer between internal and external representations" - it defines contracts (DTOs) for API responses and adapter functions that safely convert domain entities to frontend-safe formats, similar to how an API gateway transforms internal service data before exposing it to clients.

## Responsibilities

- Define contract types (DTOs) for API responses that expose only safe, serializable data
- Provide adapter functions that convert domain entities to contracts
- Hide internal database IDs and foreign keys from external consumers
- Ensure timestamps are properly serialized (Date objects in contracts)
- Define input parameter types and validation schemas for operations
- Validate coordinate paths support all Direction values: positive (1-6), zero (Center), and negative (-1 to -6 for composed children)
- Export all type definitions and validators via centralized index.ts

## Non-Responsibilities

- Domain entity definitions → See `~/lib/domains/mapping/_objects/README.md`
- Database operations and queries → See `~/lib/domains/mapping/_repositories/README.md`
- Business logic and validation → See `~/lib/domains/mapping/services/README.md`
- API endpoint implementations → See `~/server/api/routers/map/README.md`
- Coordinate system utilities → See `~/lib/domains/mapping/utils/README.md`

## Interface

**Exports**: See `index.ts` for the complete public API. Key exports:

**Contract Types:**
- `MapMappingContract`: Complete map with all descendant items
- `MapItemMappingContract`: Single map item with flattened structure
- `BaseItemVersionContract`: Historical version snapshot (no internal IDs)
- `ItemHistoryContract`: Complete version history for a tile

**Adapters:**
- `adapt.map()`: Convert MapItem root + descendants to MapContract
- `adapt.mapItem()`: Convert MapItem to MapItemContract
- `adapt.baseItem()`: Convert BaseItem to BaseItemContract
- `adapt.baseItemVersion()`: Convert BaseItemVersion to BaseItemVersionContract

**Input Types:**
- `CreateMapInput`, `CreateItemInput`, `UpdateItemInput`
- `MoveItemInput`, `SwapItemsInput`
- `CreateMapItemParams`: Validated parameters with coordinate paths supporting directions -6 to 6
- `UpdateMapItemAttrs`: Validated parameters for updating map item attributes
- Parameter validation schemas (`CreateMapItemParamsSchema`, `UpdateMapItemAttrsSchema`)
- Validation functions (`validateCreateMapItemParams`, `validateUpdateMapItemAttrs`)

**Other:**
- `DatabaseTransaction`: Type for database transaction objects
- `MAPPING_ERRORS`: Error message constants

**Dependencies**: This subsystem imports from:
- `~/lib/domains/mapping/_objects` (domain entities)
- `~/lib/domains/mapping/utils` (coordinate utilities)

**Boundary Enforcement**: Other subsystems MUST import from `index.ts` only. The `pnpm check:architecture` tool enforces this boundary.
