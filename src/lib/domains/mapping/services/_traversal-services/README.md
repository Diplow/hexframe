# Traversal Services

## Mental Model

Like a **tree walker with a checklist** - it systematically visits every leaf node in a hexagonal hierarchy, keeping track of which ones have been visited, and can report the next unvisited leaf at any time.

## Responsibilities

- Traverse tile hierarchies to find leaf tiles (tiles with no structural children)
- Return leaves in deterministic direction order (1, 2, 3, 4, 5, 6)
- Track completion status to find next incomplete leaf
- Handle dynamic hierarchies where leaves may gain children (meta-leaf pattern)

## Non-Responsibilities

- Executing leaf tiles - See `~/lib/domains/agentic`
- Managing run state - See `~/lib/domains/agentic/services/_run-services`
- Querying individual tiles - See `../item-services`
- Creating or modifying tiles - See `../item-services`

## Key Concepts

### Leaf Tile

A tile is considered a "leaf" if it has no **structural children** (directions 1-6). The following are NOT considered when determining leaf status:

- Composed children (negative directions -1 to -6)
- Hexplan children (direction 0)

### Traversal Order

Leaves are returned in depth-first, direction-ordered traversal:

1. Visit children in direction order: 1 (NW), 2 (NE), 3 (E), 4 (SE), 5 (SW), 6 (W)
2. For each child, recursively visit its children first
3. Collect leaf coordinates as they're encountered

### Meta-Leaf Pattern

When a leaf tile gains children between traversal calls (e.g., an AI agent decomposed a task into subtasks), the traversal naturally handles this:

- The former leaf is no longer returned (it has children now)
- Its new children become the leaves to execute
- Previously completed coordinates are simply skipped

## Interface

```typescript
interface NextLeafResult {
  leafCoords: string | null;    // Next incomplete leaf, or null if all complete
  allLeafCoords: string[];      // All leaves in traversal order
}

class LeafTraversalService {
  constructor(deps: { itemQueryService: ItemQueryService })

  getAllLeafTiles(rootCoords: string): Promise<string[]>

  getNextIncompleteLeaf(
    rootCoords: string,
    completedCoords: Set<string>
  ): Promise<NextLeafResult>
}
```

## Usage Example

```typescript
import { LeafTraversalService } from '~/lib/domains/mapping/services';

const traversalService = new LeafTraversalService({
  itemQueryService: mappingService.items.query,
});

// Get all leaves under a root
const leaves = await traversalService.getAllLeafTiles('userId,0:1');
// Returns: ['userId,0:1,1', 'userId,0:1,3', 'userId,0:1,6,2']

// Find next incomplete leaf
const completed = new Set(['userId,0:1,1']);
const { leafCoords, allLeafCoords } = await traversalService.getNextIncompleteLeaf(
  'userId,0:1',
  completed
);
// leafCoords: 'userId,0:1,3' (next after the completed one)
```

## Dependencies

See `dependencies.json` for allowed imports.
