/**
 * Context wrapper service for MCP responses
 * Adds HexFrame-specific context to all MCP tool responses
 */

export type ContextType = 'single-tile' | 'hierarchy' | 'creation' | 'update';

/**
 * Wraps data with HexFrame context preface for Claude
 */
export function wrapWithHexframeContext(data: unknown, contextType: ContextType): string {
  const context = buildContextPreface(contextType);
  return `${context}\n\n${JSON.stringify(data, null, 2)}`;
}

/**
 * Builds context preface based on operation type
 */
function buildContextPreface(contextType: ContextType): string {
  const baseContext = `=== HEXFRAME CONTEXT ===
You are reading tiles from a Hexframe system. Tiles are hexagonal units of knowledge organized hierarchically.

KEY CONCEPTS:
- Coordinates: Each tile has coords like {userId: 1, groupId: 0, path: [0,1,2]}
- Hierarchy: path=[0,1] means 2nd child (direction 1) of root's 1st child (direction 0)
- Directions: 0=Center, 1=NorthWest, 2=NorthEast, 3=East, 4=SouthEast, 5=SouthWest, 6=West
- Navigation: Use getItemByCoords() for specific tiles, getItemsForRootItem() for full hierarchies
- Structure: Empty path=[] means root/center tile for that user

AVAILABLE MCP TOOLS:
- getItemByCoords(coords) - Get single tile
- getItemsForRootItem(userId, groupId, depth?) - Get tile hierarchy  
- addItem(parentCoords, title, content, position) - Create new tile
- updateItem(coords, updates) - Update existing tile`;

  const specificContext = getSpecificContext(contextType);
  
  return `${baseContext}${specificContext}\n===`;
}

/**
 * Gets context specific to the operation type
 */
function getSpecificContext(contextType: ContextType): string {
  switch (contextType) {
    case 'single-tile':
      return `

CURRENT OPERATION: Reading a single tile
- This tile includes parent/child relationships where available
- Use coordinates to navigate to related tiles`;

    case 'hierarchy':
      return `

CURRENT OPERATION: Reading tile hierarchy
- This shows nested structure with children[] arrays
- Each tile contains full coordinate information
- Use this to understand the knowledge map structure`;

    case 'creation':
      return `

CURRENT OPERATION: Creating a new tile
- Specify parent coordinates and position (direction 0-6)
- New tile will be created at the specified location
- Returns the created tile with generated coordinates`;

    case 'update':
      return `

CURRENT OPERATION: Updating an existing tile
- Updates title, content (descr), or URL of existing tile
- Coordinates identify which tile to update
- Returns the updated tile information`;

    default:
      return '';
  }
}