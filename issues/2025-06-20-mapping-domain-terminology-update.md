# Issue: Update mapping domain to use new terminology

**Date**: 2025-06-20
**Status**: Open
**Tags**: #refactor #architecture #tech #mapping #medium
**GitHub Issue**: #49
**Branch**: mapping-terminology-update

## Problem Statement
The mapping domain uses outdated terminology that doesn't align with the current conceptual model of the application. This is not just a mismatch between front-end code and domain code, but rather a lack of clarity compared to what is conceptualized. Consistent language has proven track records of better results when it comes to both humans and AI.

## Impact
- Developers and AI are confused by unconsistent terminology
- Code maintainability is reduced due to conceptual misalignment
- Domain-driven design principles are violated by unclear language

## Terminology update for the mapping domain
### Core Structure
#### Tile
A hexagonal unit representing a single concept, task, or function. Like a function in programming, a Tile has a clear name that conveys WHAT it does or WHAT it is about without revealing HOW.

#### Frame
The result of expanding a Tile. A Frame consists of one CenterTile surrounded by up to 6 child Tiles, revealing HOW the original Tile accomplishes its purpose.

#### CenterTile
A special Tile that serves as the center of a Frame. While visually identical to a regular Tile, expanding a CenterTile (not implemented yet) creates a new Map rather than adding to the current Generation.

#### Generation
The relative distance from a Frame's center:
- Generation 0: The CenterTile of the current Frame
- Generation 1: Up to 6 direct children of the CenterTile
- Generation 2: All children of Generation 1 tiles
- And so on...

#### Descendant
Any Tile that belongs to any Generation (1, 2, 3...) relative to a given Tile. All tiles in a Map except the CenterTile are descendants.

#### Map
A view consisting of:
- One CenterTile (the origin)
- All Generations relative to that CenterTile
- Maintains abstraction boundaries (does NOT include internal expansions of CenterTiles)

#### System
The complete hierarchical structure including:
- A root Map
- All nested Maps from expanded CenterTiles
- Full transparency without abstraction boundaries

### Spatial Concepts
#### Opposite Tiles
Two Tiles positioned at maximum distance from each other in a Frame (e.g., NW ↔ SE). Opposites typically represent tensions, dualities, or complementary aspects.

#### Neighbor Tiles
Tiles adjacent to each other in a Frame. Neighbors share natural connections and often collaborate or share context.

#### Direction
The six possible positions around a CenterTile in pointy-top hexagonal layout:
- 1 = NW (Northwest)
- 2 = NE (Northeast)
- 3 = E (East)
- 4 = SE (Southeast)
- 5 = SW (Southwest)
- 6 = W (West)

**Direction 0** has special meaning: it indicates composition. When a Tile has 0 in its Path, it means this position contains a composed System (result of drag-and-drop composition) rather than a simple Tile.
Best practice: Use string representations (NW, NE, etc.) in user interfaces and documentation for clarity, while using integers internally for Path calculations.

#### Path
An array of direction integers representing a Tile's position in the hierarchy. Example: [1, 2, 3] means: from root, go to NW child, then its NE child, then its E child.

 
## Scope Restrictions

**Initial refactoring will focus on:**
- Domain objects in `_objects/`
- Repositories in `_repositories/` and `infrastructure`
- Actions in `_actions/`

**Will NOT change (in this phase):**
- Domain services methods
- Database tables and schema
- API endpoints

**Approach:**
During solution planning, we should:
- List all current objects, actions, repositories, and service methods
- Discuss which terms to update, keep, or remove
- Focus on aligning the domain language first before propagating changes outward

## Context

*I am an AI assistant acting on behalf of @Diplow*

### Existing Documentation
- **README Files**:
  - `/src/lib/domains/README.md` - Explains general domain structure (entities, actions, services, repositories pattern)
  - `/src/lib/domains/mapping/README.md` - Main mapping domain overview with outdated references to HexMap aggregate
  - `/src/lib/domains/mapping/_actions/README.md` - Detailed actions layer documentation with current structure
  - `/src/lib/domains/mapping/infrastructure/map-item/README.md` - Infrastructure patterns for data access
  - `/src/lib/domains/mapping/services/README.md` - Services layer architecture and contracts
  
- **Architecture Docs**:
  - Domain follows DDD with clear separation: objects → repositories → actions → services → infrastructure
  - Recent refactoring eliminated HexMap aggregate - now uses MapItem directly
  - Hierarchical coordinate system with userId, groupId, and path array
  
- **Documentation vs Reality**:
  - ✅ DDD structure and layered architecture match documentation
  - ✅ Actions and services layer organization as documented
  - ❌ Main README references non-existent HexMap entity and hex-map.ts files
  - ❌ Documentation uses "item" terminology while UI uses "tile"
  - 📝 No terminology glossary or mapping guide exists

### Domain Overview
The mapping domain (`/src/lib/domains/mapping/`) implements a hierarchical hexagonal tile system following Domain-Driven Design principles:

- **Architecture**: Clean DDD with domain objects at core, wrapped by repositories, orchestrated by actions, exposed through services
- **Coordinate System**: Hierarchical positioning using `coord_user_id`, `coord_group_id`, and `path` (array of directions)
- **Item Types**: Two distinct types - USER (root maps) and BASE (child tiles with parents)
- **Recent Evolution**: Simplified from separate Map/MapItem entities to unified MapItem approach
- **GenericAggregate Pattern**: All domain objects extend GenericAggregate, providing:
  - Standardized structure with `id`, `history` (createdAt/updatedAt), `attrs`, `relatedItems`, and `relatedLists`
  - Type-safe foundation for domain entities with consistent patterns
  - Clear separation between core attributes, related entities, and related collections
  - Enables generic repository operations and consistent data handling across domains

### Key Components
- **MapItem**: Core domain object (1,938 occurrences of "item") representing tiles in hierarchy
  - Extends GenericAggregate with:
    - `attrs`: coordinates, itemType, parentId, refItemId, originId
    - `relatedItems`: ref (BaseItem), parent (MapItem), origin (MapItem)
    - `relatedLists`: neighbors (MapItem[])
  - Methods: validation, coordinate management, parent-child relationships
  - Enforces business rules: USER items cannot have parents, BASE items must have parents
  
- **BaseItem**: Reference content for map items
  - Extends GenericAggregate with:
    - `attrs`: title, descr, link
    - No related items or lists (simple value object)
  - Provides the actual data displayed in tiles
  
- **MapItemActions**: Business logic orchestration with specialized helpers
  - `MapItemCreationHelpers`: Handle item creation with coordinate assignment
  - `MapItemMovementHelpers`: Manage move operations and descendant updates
  - `MapItemQueryHelpers`: Complex queries for fetching items
  
- **Services Layer**: High-level API with specialized services
  - `MappingService`: Main coordinator
  - `MapManagementService`: Map-level operations
  - `ItemManagementService`: Item-level operations
  - `ItemCrudService`: CRUD operations
  - `ItemQueryService`: Query operations

### Implementation Details
- **File Organization**:
  ```
  _objects/
    ├── base-item.ts
    └── map-item.ts
  _repositories/
    ├── base-item.ts
    └── map-item.ts
  _actions/
    ├── map-item.actions.ts
    └── helpers/
  services/
    ├── mapping.service.ts
    └── specialized services
  ```

- **Naming Conventions**:
  - Backend: "item", "mapItem", "descendants", "move", "swap"
  - Frontend: "tile", "children", "centerTile"
  - Database: "map_items", "base_items" tables
  
- **Design Patterns**:
  - Repository pattern for data abstraction
  - Service layer for API contracts
  - Actions for complex business logic
  - Helper classes for code organization
  
- **Data Flow**:
  1. Services receive requests with contracts
  2. Actions orchestrate business logic
  3. Repositories handle data access
  4. Domain objects maintain invariants

### Code Examples
```typescript
// Current domain object (map-item.ts)
export class MapItem {
  public readonly id: number;
  public readonly coord: Coord;
  public readonly itemType: MapItemType;
  public readonly parentId: number | null;
  
  // Current terminology in methods
  public validate(): void { ... }
  public isCenter(): boolean { ... }
}

// Current service API (mapping.service.ts)
export class MappingService {
  async getMapsForUser(userId: number): Promise<MapContract[]>
  async getMapItems(mapId: number): Promise<MapItemContract[]>
  async moveMapItem(params: MoveMapItemParams): Promise<MoveMapItemResult>
}

// Database schema (map-items.ts)
export const mapItems = createTable("map_items", {
  id: integer("id").primaryKey(),
  coord_user_id: integer("coord_user_id"),
  coord_group_id: integer("coord_group_id"),
  path: varchar("path", { length: 255 }),
  item_type: varchar("item_type", { length: 50 }),
  parent_id: integer("parent_id"),
  ref_item_id: integer("ref_item_id")
});
```

### Dependencies and Integration
- **Internal Dependencies**:
  - Uses `hex-coordinates` package for spatial calculations
  - Depends on IAM domain for user context
  - Integrates with database through Drizzle ORM
  
- **External Consumers**:
  - tRPC routers in `/src/server/routers/map.ts`
  - React hooks in `/src/app/_hooks/` 
  - UI components in `/src/app/map/`
  
- **API Contracts**:
  - `MapContract`, `MapItemContract` for external communication
  - DTOs maintain backward compatibility
  
- **Database Schema**:
  - `vde_map_items`: Main table with coordinates and hierarchy
  - `vde_base_items`: Content storage
  - `vde_user_mapping`: Auth user to mapping user bridge