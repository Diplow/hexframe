# TilePosition Service

## Purpose
Provides canvas-relative positions for tiles using DOM queries, enabling overlay components to position visual feedback at exact tile locations.

## Responsibilities
- Query DOM for tile elements using `data-tile-id` attributes
- Calculate tile positions relative to canvas center
- Provide singleton service accessible throughout the application
- Work with any visible tile (center, neighbors, expanded children)

## Dependencies
See `dependencies.json`

## Public API
```typescript
export { globalTilePositionService } from './GlobalTilePositionService';
export type { TilePosition } from './GlobalTilePositionService';
```

## Usage
```typescript
import { globalTilePositionService } from '~/app/map/Services/TilePosition';

// Set canvas reference (in canvas component)
useEffect(() => {
  globalTilePositionService.setCanvasElement(canvasRef.current);
  return () => globalTilePositionService.setCanvasElement(null);
}, []);

// Get tile position (anywhere in app)
const position = globalTilePositionService.getTilePosition('1,0:1,2');
// Returns { x: 100, y: 200 } or null if tile not found
```

## Architecture Notes
- **Singleton pattern**: Same as GlobalDragService for consistency
- **DOM-based**: Queries actual rendered tiles, always accurate
- **Canvas-relative**: Positions relative to canvas center (0, 0)
- **Lazy evaluation**: Positions calculated on-demand, no caching needed