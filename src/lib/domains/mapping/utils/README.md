# Mapping Utils

## Mental Model

The Utils subsystem is the "coordinate calculator" for the hexagonal mapping system - it provides pure mathematical functions for coordinate manipulation, similar to how a geometry library provides functions for points and vectors without any business logic.

## Responsibilities

- Generate child coordinates for all 6 structural directions (NorthWest, NorthEast, East, SouthEast, SouthWest, West)
- Generate composition coordinates (direction 0 / Center) for any parent tile
- Generate composed child coordinates with negative directions (-1 to -6) for composed children
- Parse and serialize coordinates between object format (Coord) and string format (coordId)
- Handle negative directions in all coordinate operations (parsing, serialization, queries)
- Check ancestor/descendant relationships between coordinates (including composed children)
- Calculate coordinate properties (depth, direction, parent) for all direction types
- Validate coordinate structure (userId, groupId, path format)
- Provide both Coord-based and ID-based APIs for all operations

## Non-Responsibilities

- Business rule validation (e.g., "root tiles cannot have compositions") → See `~/lib/domains/mapping/services/README.md`
- Database queries for map items → See `~/lib/domains/mapping/_repositories/README.md`
- UI rendering of hexagons → See `~/app/map/Canvas/README.md`
- State management → See `~/app/map/Cache/README.md`
- Item creation/deletion → See `~/lib/domains/mapping/services/README.md`

## Interface

**Exports**: See `index.ts` for the complete public API. Key exports:

**Core Types:**
- `Coord`: Coordinate object with userId, groupId, and path
- `Direction`: Enum for all 13 directions:
  - Structural: NorthWest=1, NorthEast=2, East=3, SouthEast=4, SouthWest=5, West=6
  - Composition: Center=0
  - Composed: ComposedNorthWest=-1, ComposedNorthEast=-2, ComposedEast=-3, ComposedSouthEast=-4, ComposedSouthWest=-5, ComposedWest=-6

**Coordinate Generation:**
- `CoordSystem.getCompositionCoord(parent)`: Generate composition coordinate (direction 0)
- `CoordSystem.getCompositionCoordFromId(parentId)`: ID-based composition generation
- `CoordSystem.getComposedChildCoords(parent)`: Generate 6 composed child coordinates (negative directions)
- `CoordSystem.getComposedChildCoordsFromId(parentId)`: ID-based composed child generation
- `CoordSystem.getChildCoords(parent, includeComposition?)`: Get 6 structural children, or 7 with composition
- `CoordSystem.getChildCoordsFromId(parentId, includeComposition?)`: ID-based version

**Coordinate Parsing:**
- `CoordSystem.createId(coord)`: Convert Coord to string ID
- `CoordSystem.parseId(id)`: Convert string ID to Coord
- `coordToString(coord)`: Standalone helper
- `stringToCoord(coordId)`: Standalone helper

**Coordinate Queries:**
- `CoordSystem.getParentCoord(coord)`: Get parent coordinate
- `CoordSystem.getDirection(coord)`: Get last direction in path (supports negative directions)
- `CoordSystem.getSiblingsFromId(coordId)`: Get sibling coordinates (returns composed siblings for composed children)
- `CoordSystem.isDescendant(childId, parentId)`: Check descendant relationship (supports negative directions)
- `CoordSystem.isAncestor(parentId, childId)`: Check ancestor relationship (supports negative directions)
- `CoordSystem.isCenter(coord)`: Check if root tile (empty path)
- `CoordSystem.isComposedChild(coord)`: Check if coordinate contains negative direction
- `CoordSystem.isComposedChildId(id)`: ID-based check for composed child

**Dependencies**: This is a leaf subsystem with minimal dependencies:
- Error types from `~/lib/domains/mapping/types/errors`
- No child subsystems

**Boundary Enforcement**: All methods are static and pure functions. The `pnpm check:architecture` tool ensures this subsystem doesn't have illegal dependencies.

## Key Principles

- **Pure Functions**: All operations are stateless and side-effect-free
- **No Validation**: CoordSystem generates coordinates mathematically without business rule enforcement
- **Backwards Compatibility**: Optional parameters preserve existing behavior (e.g., `getChildCoords()` returns 6 children by default)
- **Dual APIs**: Both Coord-based and ID-based methods for convenience
