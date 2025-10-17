# Base Tile Components

## Mental Model
Like a set of "pure rendering templates" - provides non-interactive tile components that focus solely on visual presentation without hooks, state, or user interactions. Think of these as the "HTML templates" while dynamic tiles are the "React components with behavior".

## Responsibilities
- Render static hexagonal tile layouts (BaseTileLayout) with SVG paths, gradients, and styling
- Render expanded tile frames (BaseFrame) showing center tile surrounded by 6 directional children
- Render composition frames showing reduced-scale inner frames (dual frame: outer at scale-1, inner at scale-2)
- Manage scale reduction logic for nested frames and composition display
- Render base item tiles (BaseItemTile) and empty tiles (BaseEmptyTile) without interactivity
- Calculate hexagonal positioning, margins, and geometric relationships
- Handle dark mode styling for static tiles
- Detect and render composition children (direction 0) at reduced scale
- Enforce composition rendering constraints (center-only, scale > 1)

## Non-Responsibilities
- User interactions (clicks, hovers, drags) → See `../Item/README.md` and `../Empty/README.md`
- Tile state management (expanded, selected, dragged) → See `../../Cache/README.md`
- Data fetching or caching → See `../../Cache/README.md`
- Context menu and tile actions → See `../../TileActionsContext.tsx`
- Component-level behavior (_components) → See `./_components/` for BaseItemTile and BaseEmptyTile

## Interface
**Exports**: See `index.tsx` for the complete public API:
- `BaseFrame`: Main frame component with composition support
- `BaseTileLayout`: Low-level hexagonal tile layout
- `BaseItemTile`: Static item tile (via _components)
- `BaseEmptyTile`: Static empty tile (via _components)
- Type exports: `TileScale`, `TileColor`, `TileStroke`, `TileCursor`

**Key Props:**
- `compositionExpandedIds`: Array of coordIds to show composition frames for
- `scale`: Tile scale (1-6), determines frame size and nesting capability
- `interactive`: Boolean flag - false for base components, true for dynamic variants

**Composition Rendering:**
BaseFrame now supports dual-frame rendering when composition is enabled:
- **Outer frame**: Regular children at directions 1-6 (scale reduced by 1)
- **Inner frame**: Composition children at direction 0 container (scale reduced by 2)
- **Constraints**: Only center tiles can show composition, requires scale > 1

**Dependencies**: No dependencies.json needed - can import from parent Tile subsystem.

**Boundary Enforcement**: Child subsystems (_components) can access internals. Sibling subsystems must use `index.tsx` exports only. The `pnpm check:architecture` CI tool enforces this.
