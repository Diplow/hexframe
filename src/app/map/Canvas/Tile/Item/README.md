# Item

## Mental Model
Like a specialized LEGO piece with moving parts - this subsystem provides the dynamic, interactive tile component that responds to user actions (clicks, drags, editing). Think of it as the "smart twin" of the static BaseTile, adding interactivity while maintaining the same visual foundation.

## Responsibilities
- Render interactive item tiles with user interaction support (clicking, dragging, context menu)
- Manage tile interaction state (hover, drag, selection, expansion)
- Provide tile history viewing functionality (version timeline, historical content display)
- Handle tile edit mode and content editing interfaces
- Integrate tile data, user permissions, and interaction behaviors
- Display tile metadata (title, preview, content) in read-only or edit modes

## Non-Responsibilities
- Static tile rendering (layout, frames) → See `../Base/README.md`
- Empty tile behavior (placeholder interactions) → See `../Empty/README.md`
- Tile positioning and coordinate calculations → See `../utils/README.md`
- Data persistence and API calls → See `../../Cache/README.md`
- Canvas-level event handling and drag orchestration → See `../../README.md`
- Internal component implementations → See `./_components/README.md`
- Internal utilities and hooks → See `./_internals/README.md`

## Interface
**Exports**: See `index.tsx` for the complete public API. Key exports:
- `DynamicItemTile`: Main interactive tile component
- `DynamicItemTileProps`: Props interface for tile configuration
- `getColorFromItem`: Utility for determining tile color based on coordinates

**Boundary Enforcement**: Child subsystems (\_components, \_internals) can access parent code freely. All other subsystems MUST import only through `index.tsx`. The `pnpm check:architecture` tool enforces this boundary.
