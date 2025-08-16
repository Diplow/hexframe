# Hierarchy

## Why This Exists
This subsystem manages the visual parent-child navigation chain displayed on the map interface, showing users their current location context by rendering parent tiles in a vertical hierarchy from the user profile down to the current tile's immediate parent.

## Mental Model
Think of this as a breadcrumb trail that uses actual tile visualizations instead of text, showing the path from the user's root map to the current location.

## Core Responsibility
This subsystem owns:
- Rendering the vertical hierarchy visualization with tiles
- Navigation interactions within the hierarchy
- User profile tile display

This subsystem does NOT own:
- Building parent hierarchy chains (delegated to Cache)
- Tile data storage (delegated to Cache)
- Actual navigation logic (delegated to Cache)
- Authentication state (delegated to UnifiedAuth)

## Public API
See `interface.ts` for the public API. Main capabilities:
- `ParentHierarchy` - Component that renders the parent hierarchy visualization

## Dependencies
See `dependencies.json` for allowed imports.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for structure details.