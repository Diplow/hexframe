# Canvas Menu

## Mental Model
Menu is the "context menu builder" for Canvas tiles - constructing the right-click menu items based on tile state, user permissions, and available actions.

## Responsibilities
- Building context menu item lists for tiles
- Determining which menu items to show based on tile state (empty, can edit, can expand, etc.)
- Organizing menu items into logical groups (view, edit, delete)

## Non-Responsibilities
- Rendering the context menu UI → See `~/components/ui/context-menu`
- Executing menu actions → See `~/app/map/Canvas/Interactions`
- Tile data management → See `~/app/map/Cache`

## Interface
See `index.ts` for the public API.
See `dependencies.json` for allowed imports.
