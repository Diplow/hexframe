# OperationOverlay Subsystem

## Purpose
Renders visual feedback for pending map operations using hexagonal pulse animations positioned above the tile canvas.

## Responsibilities
- Display pulsing hexagon outlines at operation positions
- Support all operation types: create, update, delete, move, copy
- Work independently of tile existence (survives deletion)
- Provide operation-specific visual theming

## Dependencies
See `dependencies.json`

## Public API
```typescript
export { OperationOverlay } from './OperationOverlay';
export type { OperationOverlayProps } from './types';
```

## Usage
```tsx
import { OperationOverlay } from '~/app/map/Canvas/OperationOverlay';

<div className="canvas-container">
  <TileCanvas />
  <OperationOverlay
    pendingOperations={cache.pendingOperations}
    getTilePosition={layout.getPosition}
  />
</div>
```

## Architecture Notes
- **Position-based rendering**: Uses coordId to determine canvas position
- **SVG overlay**: Absolute positioned, pointer-events-none
- **GPU-accelerated**: CSS animations for performance
- **Operation colors**: Distinct colors per operation type

## Visual Design
- **Create**: Green pulsing hexagon (#22c55e)
- **Update**: Amber pulsing hexagon (#f59e0b)
- **Delete**: Red pulsing hexagon (#ef4444)
- **Move/Copy**: Purple pulsing hexagon (#a855f7)

## Performance
All animations are GPU-accelerated via CSS. The overlay only renders when operations are active.
