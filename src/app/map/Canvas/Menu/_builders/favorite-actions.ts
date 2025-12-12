import { Star, StarOff, Settings } from "lucide-react";
import type { MenuItem } from "~/app/map/Canvas/Menu/items-builder";

/**
 * Parameters for building the favorite menu item.
 */
interface FavoriteMenuItemParams {
  /** Whether the tile is currently marked as a favorite */
  isFavorited: boolean;
  /** Callback invoked when user clicks "Add to Favorites" (omit to hide the option) */
  onAddFavorite?: () => void;
  /** Callback invoked when user clicks "Remove from Favorites" (omit to hide the option) */
  onRemoveFavorite?: () => void;
  /** Callback invoked when user clicks "Edit Shortcut" (opens favorites panel to edit this tile's shortcut) */
  onEditShortcut?: () => void;
}

/**
 * Builds the favorite menu item for the tile context menu.
 *
 * When not favorited: Returns a simple "Add to Favorites" item.
 * When favorited: Returns a "Favorites" submenu with:
 *   - "Remove from Favorites" option
 *   - "Edit Shortcut" option (if onEditShortcut is provided)
 *
 * Returns an empty array if no required callbacks are provided.
 *
 * @param params - Configuration object containing favorite state and callbacks
 * @returns Array containing 0 or 1 menu item depending on callback availability
 *
 * @example
 * // Show "Add to Favorites" option
 * _buildFavoriteMenuItem({
 *   isFavorited: false,
 *   onAddFavorite: () => addTileToFavorites(tileId),
 * });
 *
 * @example
 * // Show "Favorites" submenu with remove and edit options
 * _buildFavoriteMenuItem({
 *   isFavorited: true,
 *   onRemoveFavorite: () => removeTileFromFavorites(tileId),
 *   onEditShortcut: () => openFavoritesPanel({ editShortcutFor: tileId }),
 * });
 */
export function _buildFavoriteMenuItem(params: FavoriteMenuItemParams): MenuItem[] {
  const { isFavorited, onAddFavorite, onRemoveFavorite, onEditShortcut } = params;

  if (isFavorited) {
    const submenuItems: MenuItem[] = [];

    if (onRemoveFavorite) {
      submenuItems.push({
        icon: StarOff,
        label: "Remove from Favorites",
        shortcut: "",
        onClick: onRemoveFavorite,
      });
    }

    if (onEditShortcut) {
      submenuItems.push({
        icon: Settings,
        label: "Edit Shortcut",
        shortcut: "",
        onClick: onEditShortcut,
      });
    }

    if (submenuItems.length === 0) return [];

    // If only one item, return it directly without submenu
    if (submenuItems.length === 1) {
      return submenuItems;
    }

    // Multiple items: create submenu
    return [
      {
        icon: Star,
        label: "Favorites",
        shortcut: "",
        submenu: submenuItems,
      },
    ];
  }

  if (!onAddFavorite) return [];
  return [
    {
      icon: Star,
      label: "Add to Favorites",
      shortcut: "",
      onClick: onAddFavorite,
    },
  ];
}
