# Hierarchy

## Mental Model
Like a visual breadcrumb trail that shows actual miniature versions of the tiles instead of text links, providing contextual navigation from the user's root map down to the current location.

## Responsibilities
- Renders the user profile tile at the top of the hierarchy visualization
- Displays a vertical chain of parent tiles from root to current location
- Handles navigation clicks to move between different levels in the tile hierarchy
- Provides visual indicators (chevrons) between hierarchy levels
- Scales down tiles for compact display in the hierarchy panel

## Non-Responsibilities
- Calculating parent hierarchy chains → See `../Cache/README.md`
- Storing tile data → See `../Cache/README.md`
- Managing authentication state → See `~/contexts/UnifiedAuthContext`
- Providing base tile rendering components → See `../Canvas/README.md`
- Fetching user map data → Uses tRPC API directly
- Managing map navigation logic → See `../Cache/README.md`

## Interface
*See `index.ts` for the public API - the ONLY exports other subsystems can use*
*See `dependencies.json` for what this subsystem can import*

Note: Child subsystems can import from parent freely, but all other subsystems MUST go through index.ts. The CI tool `pnpm check:architecture` enforces this boundary.