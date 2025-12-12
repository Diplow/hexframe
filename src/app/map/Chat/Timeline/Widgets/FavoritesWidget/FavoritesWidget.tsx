'use client';

import type { ChangeEvent } from 'react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Star, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '~/commons/trpc/react';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';
import { FavoriteListItem, FavoritesSearchControls, filterFavorites, sortFavorites, type FavoritesSortOrder } from '~/app/map/Favorites';
import { useMapCacheNavigation } from '~/app/map/Cache';

interface FavoritesWidgetProps {
  onClose?: () => void;
  /** Optional: If provided, opens with this favorite selected for shortcut editing */
  editShortcutForMapItemId?: string;
  /** Callback to insert text into the chat input */
  onInsertToChat?: (text: string) => void;
}

export function FavoritesWidget({ onClose, editShortcutForMapItemId, onInsertToChat }: FavoritesWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<FavoritesSortOrder>('name-asc');
  const [editingFavoriteId, setEditingFavoriteId] = useState<string | null>(null);
  const [shortcutSaveError, setShortcutSaveError] = useState<string | undefined>();
  const { navigateToItem } = useMapCacheNavigation();

  const favoritesQuery = api.favorites.listWithPreviews.useQuery(undefined);
  const removeFavoriteMutation = api.favorites.removeByMapItem.useMutation({
    onSuccess: () => {
      void favoritesQuery.refetch();
    },
  });
  const updateShortcutMutation = api.favorites.updateShortcut.useMutation({
    onSuccess: () => {
      setEditingFavoriteId(null);
      setShortcutSaveError(undefined);
      void favoritesQuery.refetch();
    },
    onError: (err) => {
      setShortcutSaveError(err.message);
    },
  });

  const favorites = useMemo(() => favoritesQuery.data ?? [], [favoritesQuery.data]);
  const isLoading = favoritesQuery.isLoading;
  const error = favoritesQuery.error?.message;

  const filteredFavorites = useMemo(
    () => filterFavorites(favorites, searchTerm),
    [favorites, searchTerm]
  );

  const sortedFavorites = useMemo(
    () => sortFavorites(filteredFavorites, sortOrder),
    [filteredFavorites, sortOrder]
  );

  const handleNavigate = useCallback((mapItemId: string) => {
    void navigateToItem(mapItemId);
    onClose?.();
  }, [navigateToItem, onClose]);

  const handleRemove = useCallback((favoriteId: string) => {
    const favorite = favorites.find(f => f.id === favoriteId);
    if (favorite) {
      removeFavoriteMutation.mutate({ mapItemId: favorite.mapItemId });
    }
  }, [removeFavoriteMutation, favorites]);

  const handleSaveShortcut = useCallback(async (favoriteId: string, newShortcutName: string) => {
    setEditingFavoriteId(favoriteId);
    setShortcutSaveError(undefined);
    updateShortcutMutation.mutate({ favoriteId, newShortcutName });
  }, [updateShortcutMutation]);

  const handleShortcutClick = useCallback((shortcutName: string) => {
    // Insert @shortcutName into chat input
    onInsertToChat?.(`@${shortcutName} `);
    onClose?.();
  }, [onInsertToChat, onClose]);

  const handleSortChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(event.target.value as FavoritesSortOrder);
  }, []);

  const handleRefresh = useCallback(() => {
    void favoritesQuery.refetch();
  }, [favoritesQuery]);

  // Scroll to the target favorite if editShortcutForMapItemId is provided
  // Note: editShortcutForMapItemId is actually a coordId string, not a mapItemId
  useEffect(() => {
    if (editShortcutForMapItemId && favorites.length > 0) {
      const targetFavorite = favorites.find(f => f.coordId === editShortcutForMapItemId);
      if (targetFavorite) {
        // For now just log - in a future iteration we'd scroll and highlight
        console.log('Should highlight favorite:', targetFavorite.shortcutName);
      }
    }
  }, [editShortcutForMapItemId, favorites]);

  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<Star className="h-5 w-5 text-primary" />}
        title="Favorites"
        onClose={onClose}
        collapsible={true}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <WidgetContent isCollapsed={isCollapsed}>
        <div className="flex flex-col gap-3">
          {/* Search and sort controls */}
          <div className="flex items-center gap-2">
            <FavoritesSearchControls
              searchTerm={searchTerm}
              sortOrder={sortOrder}
              onSearchChange={setSearchTerm}
              onSortChange={handleSortChange}
            />
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              aria-label="Refresh favorites"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && favorites.length === 0 && (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No favorites yet</p>
              <p className="text-xs mt-1">Right-click a tile and select &quot;Add to Favorites&quot;</p>
            </div>
          )}

          {/* No results state */}
          {!isLoading && favorites.length > 0 && sortedFavorites.length === 0 && (
            <div className="text-center py-4 text-neutral-500 dark:text-neutral-400 text-sm">
              No favorites match your search
            </div>
          )}

          {/* Favorites list */}
          {!isLoading && sortedFavorites.length > 0 && (
            <ul className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
              {sortedFavorites.map((favorite) => (
                <FavoriteListItem
                  key={favorite.id}
                  favorite={favorite}
                  tileData={{ title: favorite.title, preview: favorite.preview }}
                  onClick={handleNavigate}
                  onRemove={handleRemove}
                  onSaveShortcut={handleSaveShortcut}
                  isSavingShortcut={editingFavoriteId === favorite.id && updateShortcutMutation.isPending}
                  shortcutSaveError={editingFavoriteId === favorite.id ? shortcutSaveError : undefined}
                  onShortcutClick={onInsertToChat ? handleShortcutClick : undefined}
                />
              ))}
            </ul>
          )}
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}
