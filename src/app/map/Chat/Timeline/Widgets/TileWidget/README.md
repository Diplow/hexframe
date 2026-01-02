# TileWidget

## Mental Model
Like a document viewer with an edit mode toggle - you can view a tile's content and seamlessly switch to editing it inline.

## Responsibilities
- Display tile content in a collapsible preview interface
- Manage expansion/collapse state with smooth animations
- Provide inline editing mode for tile title, content, and type
- Handle edit state management (save/cancel operations)
- Auto-close when the previewed tile is deleted from cache
- Support keyboard shortcuts for save (Ctrl/Cmd+Enter) and cancel (Escape)
- Delegate drag-and-drop functionality to DraggableTilePreview component

## Tile Type Classification

TileWidget supports tile type selection during creation and editing:

| Type | Purpose | UI Behavior |
|------|---------|-------------|
| `organizational` | Structural grouping | Visible in type dropdown |
| `context` | Reference material (default) | Default for new tiles |
| `system` | Executable capability | Visible in type dropdown |
| `user` | Root tiles only | Type selector hidden |

**Key behaviors:**
- Type selector appears in TileForm for non-USER tiles
- Hidden for USER tiles (root tiles cannot change type)
- Default type is `context` for new tiles and null/undefined tiles
- Type persisted via onSave callback with itemType parameter

## Non-Responsibilities
- Tile data persistence → See `~/app/map/Cache/README.md`
- Tile deletion operations → Delegated to parent components via callbacks
- Widget rendering infrastructure → See `../README.md`
- Drag-and-drop implementation → Delegated to DraggableTilePreview (see `~/_shared/DraggableTilePreview.tsx`)
- Global drag service integration → See `~/app/map/Services/DragAndDrop/GlobalDragService.ts`

## Drag-and-Drop Integration

TileWidget integrates with the global drag-and-drop system through a clean delegation pattern:

**Integration Chain:**
1. `TileWidget` → Renders `TileHeader`
2. `TileHeader` → Renders `_TilePreviewSection`
3. `_TilePreviewSection` → Renders `DraggableTilePreview` (for existing tiles) or `TilePreview` (for creation mode)
4. `DraggableTilePreview` → Calls `useMapCache().startDrag(tileId, event)` on drag start
5. `useMapCache().startDrag()` → Delegates to `GlobalDragService.getInstance().startDrag()`

**Key Design:**
- TileWidget has NO direct drag handlers - fully delegates to DraggableTilePreview
- DraggableTilePreview handles drag permission checks via `canDragTile()`
- GlobalDragService manages all drag state, visual feedback, and drop operations
- Supports both copy (default) and move (Ctrl+drag) operations

**Future Considerations:**
- When originId tracking is implemented in the database schema, consider adding lineage display to show tile ancestry
- Lineage could be displayed in tile metadata or as a visual indicator in the header

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.