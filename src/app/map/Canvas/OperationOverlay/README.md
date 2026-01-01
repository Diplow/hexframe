# OperationOverlay

## Mental Model
Like a status indicator layer on a control panel - renders visual feedback for in-flight operations using pulsing hexagonal animations that appear above the map canvas, showing users where changes are being processed without interfering with normal tile interactions.

## Responsibilities
- Renders pulsing hexagon outlines at operation positions above the tile canvas
- Supports all operation types: create, update, delete, move, copy, swap
- Works independently of tile existence (overlay persists even during delete operations)
- Provides operation-specific visual theming with distinct colors per type
- Subscribes to pending operations from the Operations service via usePendingOperations hook
- Maps coordinate IDs to canvas positions for accurate marker placement
- Uses GPU-accelerated CSS animations for smooth visual feedback

## Non-Responsibilities
- Operation state management and lifecycle -> See `../Services/Operations/README.md`
- Tile data and caching -> See `../../Cache/README.md`
- Tile rendering and interactions -> See `../Tile/README.md`
- Canvas layout and positioning logic -> See parent Canvas subsystem

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.

## Visual Design
- **Create**: Green pulsing hexagon (#22c55e)
- **Update**: Amber pulsing hexagon (#f59e0b)
- **Delete**: Red pulsing hexagon (#ef4444)
- **Move/Copy/Swap**: Purple pulsing hexagon (#a855f7)
