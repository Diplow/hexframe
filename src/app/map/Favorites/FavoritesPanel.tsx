'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '~/lib/utils';
import { FavoritesPanelHeader } from '~/app/map/Favorites/_components/_panel/FavoritesPanelHeader';
import { FavoritesPanelContent } from '~/app/map/Favorites/_components/_panel/FavoritesPanelContent';
import { usePanelHandlers } from '~/app/map/Favorites/_hooks/use-panel-handlers';
import { filterFavorites, sortFavorites, type FavoritesSortOrder, type TileDataMap } from '~/app/map/Favorites/_utils';
import type { Favorite } from '~/lib/domains/iam';
import type { FavoriteTileData } from '~/app/map/Favorites/FavoriteListItem';

export type { TileDataMap, FavoritesSortOrder, FavoriteTileData };

/**
 * Props for the FavoritesPanel component.
 */
export interface FavoritesPanelProps {
  /** Array of user favorites to display */
  favorites: Favorite[];
  /** Map of mapItemId to tile data (title, preview) for enriching favorites display */
  tileData: TileDataMap;
  /** Whether favorites are currently being loaded */
  isLoading?: boolean;
  /** Error message to display (shows error state with retry button) */
  error?: string;
  /** When true, shows confirmation dialog before removing a favorite */
  confirmOnRemove?: boolean;
  /** Callback when user clicks a favorite to navigate to it */
  onNavigate?: (mapItemId: string) => void;
  /** Callback when user removes a favorite */
  onRemove?: (favoriteId: string) => void;
  /** Callback when sort order changes (for persistence) */
  onSortChange?: (sortOrder: FavoritesSortOrder) => void;
  /** Callback when user clicks retry after an error */
  onRetry?: () => void;
  /** Additional CSS classes for the panel container */
  className?: string;
}

/**
 * FavoritesPanel - A collapsible panel displaying the user's favorited tiles.
 *
 * Features:
 * - Displays favorites with shortcut names (@name) and tile metadata
 * - Search/filter by shortcut name or tile title
 * - Sort by name (A-Z, Z-A) or date (newest, oldest)
 * - Click to navigate, with remove button on each item
 * - Handles loading, empty, and error states
 *
 * @example
 * ```tsx
 * <FavoritesPanel
 *   favorites={favorites}
 *   tileData={tileData}
 *   onNavigate={(mapItemId) => navigateToTile(mapItemId)}
 *   onRemove={(favoriteId) => removeFavorite(favoriteId)}
 * />
 * ```
 */
export function FavoritesPanel({
  favorites, tileData, isLoading = false, error, confirmOnRemove = false,
  onNavigate, onRemove, onSortChange, onRetry, className,
}: FavoritesPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handlers = usePanelHandlers({ confirmOnRemove, onNavigate, onRemove, onSortChange });
  const filteredFavorites = useMemo(() => filterFavorites(favorites, searchTerm, tileData), [favorites, searchTerm, tileData]);
  const sortedFavorites = useMemo(() => sortFavorites(filteredFavorites, handlers.sortOrder), [filteredFavorites, handlers.sortOrder]);
  const toggleCollapse = useCallback(() => setIsCollapsed((prev) => !prev), []);

  return (
    <section
      role="region"
      aria-label="Favorites"
      className={cn('flex flex-col bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-lg', className)}
    >
      <FavoritesPanelHeader isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
      {!isCollapsed && (
        <FavoritesPanelContent
          favorites={favorites}
          sortedFavorites={sortedFavorites}
          tileData={tileData}
          isLoading={isLoading}
          error={error}
          searchTerm={searchTerm}
          sortOrder={handlers.sortOrder}
          pendingRemoveId={handlers.pendingRemoveId}
          onSearchChange={setSearchTerm}
          onSortChange={handlers.handleSortChange}
          onNavigate={handlers.handleNavigate}
          onRemove={handlers.handleRemove}
          onConfirmRemove={handlers.confirmRemove}
          onCancelRemove={handlers.cancelRemove}
          onRetry={onRetry}
        />
      )}
    </section>
  );
}
