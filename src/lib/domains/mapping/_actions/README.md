# Mapping Domain Actions

## Mental Model
Like a mission control center for map operations - coordinates multiple specialized teams (creation, movement, querying) to execute complex map item operations while ensuring everything follows the rules.

## Responsibilities
- Orchestrate map item creation with proper validation and parent-child relationships
- Coordinate map item movement operations with automatic descendant updates and displacement handling
- Execute map item queries for retrieval by coordinates, ID, or relationships
- Manage map item removal with cascade deletion of all descendants
- Update base item references while maintaining referential integrity

## Non-Responsibilities
- Domain object definitions → See `~/lib/domains/mapping/_objects/README.md`
- Data persistence → See `~/lib/domains/mapping/_repositories/README.md`
- Coordinate system utilities → See `~/lib/domains/mapping/utils/README.md`
- Business logic services → See `~/lib/domains/mapping/services/README.md`
- Transaction infrastructure → See `~/lib/domains/mapping/infrastructure/README.md`
- Type definitions → See `~/lib/domains/mapping/types/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.