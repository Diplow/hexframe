'use client';

import { useState, useCallback, useMemo } from 'react';
import { useFavoritesState } from '~/app/map/Favorites/_hooks/use-favorites-state';
import { useFavoritesActions } from '~/app/map/Favorites/_hooks/use-favorites-actions';
import {
  filterFavorites,
  sortFavorites,
  loadSortOrder,
  saveSortOrder,
  loadCollapsedState,
  saveCollapsedState,
  type FavoritesSortOrder,
  type TileDataMap,
} from '~/app/map/Favorites/_utils';
import type { Favorite } from '~/lib/domains/iam';
import type { FavoriteTileData } from '~/app/map/Favorites/FavoriteListItem';

export type { FavoritesSortOrder, TileDataMap, FavoriteTileData };

/**
 * Options for the useFavoritesPanel hook.
 */
export interface UseFavoritesPanelOptions {
  /** Initial favorites to populate the hook (for SSR or testing) */
  initialFavorites?: Favorite[];
  /** Initial tile data map (for SSR or testing) */
  initialTileData?: TileDataMap;
  /** Initial error state (for SSR or testing) */
  initialError?: string | null;
  /** Callback when navigating to a favorite */
  onNavigate?: (mapItemId: string) => void;
  /** Mutation function to remove a favorite (typically from tRPC) */
  removeFavoriteMutation?: (favoriteId: string) => Promise<void>;
}

/**
 * Return type for the useFavoritesPanel hook.
 */
export interface UseFavoritesPanelReturn {
  // Data
  /** All favorites (unfiltered, unsorted) */
  favorites: Favorite[];
  /** Map of mapItemId to tile data */
  tileData: TileDataMap;
  /** Favorites filtered by current search term */
  filteredFavorites: Favorite[];
  /** Filtered favorites sorted by current sort order */
  sortedFavorites: Favorite[];

  // Search state
  /** Current search/filter term */
  searchTerm: string;
  /** Update the search term */
  setSearchTerm: (term: string) => void;
  /** Clear the search term */
  clearSearch: () => void;

  // Sort state
  /** Current sort order */
  sortOrder: FavoritesSortOrder;
  /** Update the sort order (persists to localStorage) */
  setSortOrder: (order: FavoritesSortOrder) => void;

  // Panel state
  /** Whether the panel is collapsed */
  isCollapsed: boolean;
  /** Set collapsed state (persists to localStorage) */
  setIsCollapsed: (collapsed: boolean) => void;
  /** Toggle collapsed state */
  toggleCollapsed: () => void;

  // Loading/error state
  /** Whether favorites are being loaded */
  isLoading: boolean;
  /** Error message, if any */
  error: string | null;

  // Selection state
  /** Currently selected favorite ID */
  selectedFavoriteId: string | null;
  /** Set the selected favorite */
  setSelectedFavoriteId: (id: string | null) => void;
  /** Clear selection */
  clearSelectedFavorite: () => void;

  // Actions
  /** Navigate to a favorite's tile (emits event) */
  navigateToFavorite: (mapItemId: string) => Promise<void>;
  /** Remove a favorite (optimistic update with rollback) */
  removeFavorite: (favoriteId: string) => Promise<void>;
  /** Refresh favorites from the server */
  refreshFavorites: () => void;

  // Computed values
  /** Total number of favorites */
  totalCount: number;
  /** Number of favorites matching current filter */
  filteredCount: number;
  /** Whether there are any favorites */
  hasFavorites: boolean;
  /** Whether search has results */
  hasSearchResults: boolean;
  /** Whether a search is active */
  isSearchActive: boolean;
}

/**
 * useFavoritesPanel - Complete state management for the favorites panel.
 *
 * Manages:
 * - Favorites data loading and caching
 * - Search/filter state with instant filtering
 * - Sort order with localStorage persistence
 * - Panel collapse state with localStorage persistence
 * - Navigation events via EventBus
 * - Optimistic remove with rollback on error
 *
 * @example
 * ```tsx
 * function MyFavoritesPanel() {
 *   const {
 *     sortedFavorites,
 *     searchTerm,
 *     setSearchTerm,
 *     navigateToFavorite,
 *     removeFavorite,
 *   } = useFavoritesPanel({
 *     onNavigate: (id) => console.log('Navigate to', id),
 *   });
 *
 *   return (
 *     <div>
 *       <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
 *       {sortedFavorites.map(fav => (
 *         <FavoriteListItem
 *           key={fav.id}
 *           favorite={fav}
 *           onClick={navigateToFavorite}
 *           onRemove={removeFavorite}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFavoritesPanel(
  options: UseFavoritesPanelOptions = {}
): UseFavoritesPanelReturn {
  const { onNavigate, removeFavoriteMutation } = options;

  const dataState = useFavoritesState(options);
  const { favorites, setFavorites, tileData, isLoading, error, refreshFavorites } = dataState;

  const actions = useFavoritesActions({
    favorites,
    setFavorites,
    onNavigate,
    removeFavoriteMutation,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrderState] = useState<FavoritesSortOrder>(loadSortOrder);
  const [isCollapsed, setIsCollapsedState] = useState(loadCollapsedState);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string | null>(null);

  const setSortOrder = useCallback((order: FavoritesSortOrder) => {
    setSortOrderState(order);
    saveSortOrder(order);
  }, []);

  const setIsCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    saveCollapsedState(collapsed);
  }, []);

  const toggleCollapsed = useCallback(() => setIsCollapsed(!isCollapsed), [isCollapsed, setIsCollapsed]);
  const clearSearch = useCallback(() => setSearchTerm(''), []);
  const clearSelectedFavorite = useCallback(() => setSelectedFavoriteId(null), []);

  const filteredFavorites = useMemo(
    () => filterFavorites(favorites, searchTerm, tileData),
    [favorites, searchTerm, tileData]
  );

  const sortedFavorites = useMemo(
    () => sortFavorites(filteredFavorites, sortOrder),
    [filteredFavorites, sortOrder]
  );

  return {
    favorites,
    tileData,
    filteredFavorites,
    sortedFavorites,
    searchTerm,
    setSearchTerm,
    clearSearch,
    sortOrder,
    setSortOrder,
    isCollapsed,
    setIsCollapsed,
    toggleCollapsed,
    isLoading,
    error,
    selectedFavoriteId,
    setSelectedFavoriteId,
    clearSelectedFavorite,
    navigateToFavorite: actions.navigateToFavorite,
    removeFavorite: actions.removeFavorite,
    refreshFavorites,
    totalCount: favorites.length,
    filteredCount: filteredFavorites.length,
    hasFavorites: favorites.length > 0,
    hasSearchResults: searchTerm.trim().length > 0 && filteredFavorites.length > 0,
    isSearchActive: searchTerm.trim().length > 0,
  };
}
