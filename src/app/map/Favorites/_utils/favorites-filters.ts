import type { Favorite } from '~/lib/domains/iam/_repositories';
import type { FavoriteTileData } from '~/app/map/Favorites/FavoriteListItem';

/**
 * Favorite enriched with tile data from the API
 */
export interface FavoriteWithPreview extends Favorite {
  title?: string;
  preview?: string;
}

/**
 * @deprecated Use FavoriteWithPreview instead. TileDataMap is kept for backwards compatibility.
 */
export type TileDataMap = Record<string, FavoriteTileData>;

/**
 * Sort order options for favorites
 */
export type FavoritesSortOrder =
  | 'name-asc'
  | 'name-desc'
  | 'date-asc'
  | 'date-desc';

/**
 * Filters favorites based on a search term.
 * Matches against shortcut name, tile title, and preview.
 *
 * @overload New API: favorites with embedded title/preview
 * @overload Legacy API: favorites with separate tileData map (deprecated)
 */
export function filterFavorites(
  favorites: FavoriteWithPreview[],
  searchTerm: string
): FavoriteWithPreview[];
export function filterFavorites(
  favorites: Favorite[],
  searchTerm: string,
  tileData: TileDataMap
): Favorite[];
export function filterFavorites(
  favorites: (Favorite | FavoriteWithPreview)[],
  searchTerm: string,
  tileData?: TileDataMap
): (Favorite | FavoriteWithPreview)[] {
  if (!searchTerm.trim()) return favorites;

  const lowerSearchTerm = searchTerm.toLowerCase();
  return favorites.filter((favorite) => {
    const matchesShortcut = favorite.shortcutName
      .toLowerCase()
      .includes(lowerSearchTerm);

    // Check embedded fields (new API)
    const enrichedFavorite = favorite as FavoriteWithPreview;
    const matchesEmbeddedTitle = enrichedFavorite.title?.toLowerCase().includes(lowerSearchTerm);
    const matchesEmbeddedPreview = enrichedFavorite.preview?.toLowerCase().includes(lowerSearchTerm);

    // Check tileData map (legacy API)
    const tileInfo = tileData?.[favorite.mapItemId];
    const matchesTileTitle = tileInfo?.title?.toLowerCase().includes(lowerSearchTerm);
    const matchesTilePreview = tileInfo?.preview?.toLowerCase().includes(lowerSearchTerm);

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Using || for boolean OR logic, not default value assignment
    return matchesShortcut || matchesEmbeddedTitle || matchesEmbeddedPreview || matchesTileTitle || matchesTilePreview;
  });
}

/**
 * Sorts favorites based on the specified sort order.
 */
export function sortFavorites<T extends Favorite>(
  favorites: T[],
  sortOrder: FavoritesSortOrder
): T[] {
  const sorted = [...favorites];

  switch (sortOrder) {
    case 'name-asc':
      sorted.sort((sortItemA, sortItemB) =>
        sortItemA.shortcutName.localeCompare(sortItemB.shortcutName)
      );
      break;
    case 'name-desc':
      sorted.sort((sortItemA, sortItemB) =>
        sortItemB.shortcutName.localeCompare(sortItemA.shortcutName)
      );
      break;
    case 'date-asc':
      sorted.sort(
        (sortItemA, sortItemB) =>
          new Date(sortItemA.createdAt).getTime() -
          new Date(sortItemB.createdAt).getTime()
      );
      break;
    case 'date-desc':
      sorted.sort(
        (sortItemA, sortItemB) =>
          new Date(sortItemB.createdAt).getTime() -
          new Date(sortItemA.createdAt).getTime()
      );
      break;
  }

  return sorted;
}
