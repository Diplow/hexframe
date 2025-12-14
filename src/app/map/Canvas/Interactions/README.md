# Canvas Interactions

## Mental Model
Interactions are the "input handlers" of the Canvas - converting user actions (clicks, keyboard events, drags) into application events that other subsystems can process.

## Responsibilities
- Keyboard event handling (Ctrl/Shift key detection for navigation and expansion cursors)
- Tile click handling (single click, double click, modifier key combinations)
- Event callback factories (bridging Canvas actions with Cache operations)
- Default tile action stubs (drag handlers, hover state)
- Simulated drag operations (initiated from context menu)

## Non-Responsibilities
- Canvas rendering → See parent Canvas component
- Context menu UI → See `~/app/map/Canvas/Menu`
- Tile positioning → See `~/app/map/Canvas/HexGeometry`
- Tile data management → See `~/app/map/Cache`

## Interface
See `index.ts` for the public API.
See `dependencies.json` for allowed imports.
