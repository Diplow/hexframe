# Canvas Internals

## Mental Model
Canvas Internals are the "supporting machinery" of the Canvas - utilities for drag simulation, event handling, keyboard shortcuts, and tile interactions that the main Canvas component depends on but shouldn't expose externally.

## Responsibilities
- Simulating drag operations for tile movement
- Handling keyboard shortcuts and events
- Managing tile click and action handlers
- Helper utilities for loading states and neighbor calculations

## Non-Responsibilities
- Canvas rendering → See `../` (parent Canvas component)
- Tile data management → See `~/app/map/Cache`
- Context menu UI → See `./menu/`
- Neighbor positioning → See `./neighbor-helpers/`

## Interface
See `index.ts` for the public API (if any).
See `dependencies.json` for allowed imports.
