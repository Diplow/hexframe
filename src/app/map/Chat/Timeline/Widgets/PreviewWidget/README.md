# PreviewWidget

## Mental Model
Like a document viewer with an edit mode toggle - you can preview a tile's content and seamlessly switch to editing it inline.

## Responsibilities
- Display tile content in a collapsible preview interface
- Manage expansion/collapse state with smooth animations
- Provide inline editing mode for tile title and content
- Handle edit state management (save/cancel operations)
- Auto-close when the previewed tile is deleted from cache
- Support keyboard shortcuts for save (Ctrl/Cmd+Enter) and cancel (Escape)

## Non-Responsibilities
- Tile data persistence → See `~/app/map/Cache/README.md`
- Tile deletion operations → Delegated to parent components via callbacks
- Widget rendering infrastructure → See `../README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.