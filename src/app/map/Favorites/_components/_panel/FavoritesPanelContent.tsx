'use client';

import { ErrorState, LoadingState, EmptyState, NoResultsState } from '~/app/map/Favorites/_components/_panel/FavoritesPanelStates';
import { FavoritesSearchControls } from '~/app/map/Favorites/_components/_panel/FavoritesSearchControls';
import { FavoritesConfirmDialog } from '~/app/map/Favorites/_components/_panel/FavoritesConfirmDialog';
import { FavoritesList } from '~/app/map/Favorites/_components/_panel/FavoritesList';
import type { Favorite } from '~/lib/domains/iam';
import type { FavoritesSortOrder, TileDataMap } from '~/app/map/Favorites/_utils';

export interface FavoritesPanelContentProps {
  favorites: Favorite[];
  sortedFavorites: Favorite[];
  tileData: TileDataMap;
  isLoading: boolean;
  error?: string;
  searchTerm: string;
  sortOrder: FavoritesSortOrder;
  pendingRemoveId: string | null;
  onSearchChange: (term: string) => void;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onNavigate: (mapItemId: string) => void;
  onRemove: (favoriteId: string) => void;
  onConfirmRemove: () => void;
  onCancelRemove: () => void;
  onRetry?: () => void;
}

/**
 * Renders the content section of the FavoritesPanel.
 */
export function FavoritesPanelContent({
  favorites,
  sortedFavorites,
  tileData,
  isLoading,
  error,
  searchTerm,
  sortOrder,
  pendingRemoveId,
  onSearchChange,
  onSortChange,
  onNavigate,
  onRemove,
  onConfirmRemove,
  onCancelRemove,
  onRetry,
}: FavoritesPanelContentProps) {
  const hasNoFavorites = favorites.length === 0;
  const hasNoResults = searchTerm.trim() && sortedFavorites.length === 0;

  return (
    <>
      {error && <ErrorState error={error} onRetry={onRetry} />}
      {isLoading && !error && <LoadingState />}
      {!isLoading && !error && hasNoFavorites && <EmptyState />}

      {!isLoading && !error && !hasNoFavorites && (
        <>
          <FavoritesSearchControls
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            sortOrder={sortOrder}
            onSortChange={onSortChange}
          />

          {hasNoResults && <NoResultsState />}

          {!hasNoResults && (
            <FavoritesList
              favorites={sortedFavorites}
              tileData={tileData}
              onNavigate={onNavigate}
              onRemove={onRemove}
            />
          )}
        </>
      )}

      {pendingRemoveId && (
        <FavoritesConfirmDialog
          onConfirm={onConfirmRemove}
          onCancel={onCancelRemove}
        />
      )}
    </>
  );
}
