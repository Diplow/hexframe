# Item Services

## Mental Model

Think of _item-services as the **specialized staff** in the hotel management system. While the parent services folder is the general coordination layer, this subsystem contains the actual workers who perform specific tasks:
- **ItemCrudService** is housekeeping - handles day-to-day room operations (create, read, update, delete)
- **ItemQueryService** is the concierge - helps guests find and navigate rooms, handles complex queries
- **ItemHistoryService** is the archives department - tracks all room changes over time
- **ItemManagementService** is the floor manager - coordinates the specialized staff
- **ItemContextService** is the information desk - provides context about items and their surroundings

## Responsibilities

- Perform CRUD operations on individual map items
- Execute complex queries (descendants, composition, movement)
- Manage version history for tiles with pagination support
- Handle bulk operations (delete children by type)
- Coordinate item-level services through ItemManagementService
- Provide item context information

## Non-Responsibilities

- Map-level operations → See `../` (parent services folder)
- Data persistence → See `~/lib/domains/mapping/infrastructure/`
- Business logic orchestration → See `~/lib/domains/mapping/_actions/`
- Domain entities → See `~/lib/domains/mapping/_objects/`
- Coordinate utilities → See `~/lib/domains/mapping/utils/`

## Interface

See `index.ts` for the public API - exports:
- `ItemCrudService` - CRUD operations on items
- `ItemQueryService` - Complex queries and movement
- `ItemHistoryService` - Version history queries
- `ItemManagementService` - Coordinator for item services
- `ItemContextService` - Context information for items

See `dependencies.json` for what this subsystem can import.
