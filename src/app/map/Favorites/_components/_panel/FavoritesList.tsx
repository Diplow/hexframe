'use client';

import { FavoriteListItem } from '~/app/map/Favorites/FavoriteListItem';
import type { Favorite } from '~/lib/domains/iam/_repositories';
import type { TileDataMap } from '~/app/map/Favorites/_utils/favorites-filters';

export interface FavoritesListProps {
  favorites: Favorite[];
  tileData: TileDataMap;
  onNavigate: (mapItemId: string) => void;
  onRemove: (favoriteId: string) => void;
}

/**
 * Renders the list of favorite items.
 */
export function FavoritesList({
  favorites,
  tileData,
  onNavigate,
  onRemove,
}: FavoritesListProps) {
  return (
    <ul
      role="list"
      aria-label="Favorites list"
      className="px-1 py-2 space-y-1 max-h-[300px] overflow-y-auto"
    >
      {favorites.map((favorite) => (
        <FavoriteListItem
          key={favorite.id}
          favorite={favorite}
          tileData={tileData[favorite.mapItemId]}
          onClick={onNavigate}
          onRemove={onRemove}
          showEditButton={false}
        />
      ))}
    </ul>
  );
}
