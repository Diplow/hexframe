# Favorites

## Mental Model

The Favorites subsystem is a **bookmark manager** for the hexagonal map. Think of it like
browser bookmarks with superpowers: users can save their most important tiles, search through
them instantly, and jump to any tile with a single click.

Each favorite has a **shortcut name** (displayed with `@` prefix like `@project_plan`) that
serves as a quick reference, independent of the tile's actual title. This allows users to
create their own naming conventions for frequently-accessed tiles.

The panel maintains its state (collapsed, sort order) across sessions via localStorage,
ensuring users return to their preferred view.

## Responsibilities

- **Display favorites**: Render a collapsible panel showing all user favorites with tile metadata
- **Search/filter**: Allow instant filtering by shortcut name or tile title (case-insensitive)
- **Sort ordering**: Support sorting by name (A-Z, Z-A) or date (newest, oldest) with persistence
- **Navigation**: Emit events when users click to navigate to a favorited tile
- **Remove**: Handle favorite removal with optional confirmation dialog
- **Loading states**: Show skeletons during data fetching
- **Error handling**: Display errors with retry functionality

## Non-Responsibilities

- **Authentication/user management** - Delegates to `~/lib/domains/iam/README.md`
- **Tile data fetching** - Delegates to `~/app/map/Cache/README.md`
- **Navigation execution** - Emits events via `~/app/map/Services/EventBus/README.md`
- **Adding favorites** - Handled by context menu in other subsystems

## Interface

See `index.ts` for the public API - the **only** exports other subsystems can use:

### Components
- `FavoritesPanel` - Main panel component with full UI (search, sort, list, states)
- `FavoriteListItem` - Individual favorite item (for custom list implementations)

### Hooks
- `useFavoritesPanel` - Complete state management for the favorites feature

### Types
- `FavoritesPanelProps` - Props for FavoritesPanel component
- `FavoriteListItemProps` - Props for FavoriteListItem component
- `FavoriteTileData` - Tile metadata (title, preview) for a favorite
- `TileDataMap` - Map of mapItemId to FavoriteTileData
- `UseFavoritesPanelOptions` - Options for useFavoritesPanel hook
- `UseFavoritesPanelReturn` - Return type of useFavoritesPanel hook
- `FavoritesSortOrder` - Sort order type: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'

## Dependencies

See `dependencies.json` for what this subsystem can import.
