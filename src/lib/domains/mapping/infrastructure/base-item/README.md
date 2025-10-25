# BaseItem Infrastructure

## Mental Model
The BaseItem infrastructure is like a "version-aware database adapter" that handles all database operations for base items (content storage) and automatically creates immutable snapshots of content changes for complete version history tracking.

## Responsibilities
- Implement CRUD operations for baseItems table (create, read, update, delete)
- Automatically create version snapshots when baseItems are created or updated
- Manage version numbering (sequential: 1, 2, 3...) for each baseItem
- Store historical snapshots in base_item_versions table with proper foreign keys
- Map between database rows and domain entities (BaseItem aggregate)
- Handle null/empty string conversion for optional fields (preview, link)
- Preserve referential integrity through CASCADE deletes (versions deleted with baseItem)

## Non-Responsibilities
- Business logic and validation → See `~/lib/domains/mapping/services/README.md`
- BaseItem domain entity behavior → See `~/lib/domains/mapping/_objects/README.md`
- Repository interface definitions → See `~/lib/domains/mapping/_repositories/README.md`
- Database schema definitions → See `~/server/db/schema/README.md`
- MapItem operations → See `../map-item/README.md`
- Transaction management → See `../transaction-manager.ts`
- Version retrieval and display → Future: See `~/app/map/Chat/Timeline/Widgets/TileWidget/History/`

## Interface
**Internal Implementation**: This subsystem is not exported from `../index.ts` - it's an internal implementation detail.

**Repository Class**: `DbBaseItemRepository` implements the `BaseItemRepository` interface:
- `create(attrs)`: Creates baseItem and version 1 snapshot
- `update(aggregate, attrs)`: Updates baseItem and creates version snapshot with OLD values
- `updateByIdr(idr, attrs)`: Same as update but using identifier
- `getOne(id)`: Retrieves baseItem by ID
- `getMany()`: Retrieves multiple baseItems with pagination
- `remove(id)`: Deletes baseItem (versions cascade automatically)

**Version Tracking**:
- Version created on baseItem creation (version 1)
- Version created BEFORE each update (captures OLD values)
- Versions are immutable once created
- Version numbering is sequential per baseItem
- Empty strings converted to NULL for optional fields

**Dependencies**: Imports from:
- `~/server/db` (schema, database connection)
- `~/lib/domains/mapping/_objects/base-item` (domain entity)
- `drizzle-orm` (query builders)

**Note**: Other subsystems should use the repository through the mapping domain services layer, not directly.
