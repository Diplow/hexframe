/**
 * @module Favorites
 *
 * Public API for the Favorites Subsystem.
 *
 * The Favorites subsystem provides UI components for managing user favorites -
 * a bookmark-like feature that allows users to save, organize, and quickly
 * navigate to their most important tiles.
 *
 * ## Features
 * - Display favorites in a collapsible panel
 * - Search/filter by shortcut name or tile title
 * - Sort by name (A-Z, Z-A) or date (newest, oldest)
 * - Navigate to favorited tiles with one click
 * - Remove favorites with optional confirmation
 *
 * ## Usage
 *
 * ```tsx
 * import { FavoritesPanel, useFavoritesPanel } from '~/app/map/Favorites';
 *
 * // Option 1: Use the full panel component
 * <FavoritesPanel
 *   favorites={favorites}
 *   tileData={tileData}
 *   onNavigate={handleNavigate}
 *   onRemove={handleRemove}
 * />
 *
 * // Option 2: Build custom UI with the hook
 * const { sortedFavorites, searchTerm, setSearchTerm } = useFavoritesPanel();
 * ```
 *
 * @see README.md for full documentation
 */

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

/** Main panel component with full favorites UI */
export { FavoritesPanel } from '~/app/map/Favorites/FavoritesPanel';
export type { FavoritesPanelProps, TileDataMap } from '~/app/map/Favorites/FavoritesPanel';

/** Individual favorite list item for custom implementations */
export { FavoriteListItem } from '~/app/map/Favorites/FavoriteListItem';
export type {
  FavoriteListItemProps,
  FavoriteTileData,
} from '~/app/map/Favorites/FavoriteListItem';

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

/** Complete state management hook for favorites */
export { useFavoritesPanel } from '~/app/map/Favorites/_hooks/use-favorites-panel';
export type {
  UseFavoritesPanelOptions,
  UseFavoritesPanelReturn,
  FavoritesSortOrder,
} from '~/app/map/Favorites/_hooks/use-favorites-panel';
