'use client';

import { useCallback } from 'react';
import { useEventBus } from '~/app/map/Services/EventBus';
import type { Favorite } from '~/lib/domains/iam/_repositories';

export interface UseFavoritesActionsOptions {
  favorites: Favorite[];
  setFavorites: React.Dispatch<React.SetStateAction<Favorite[]>>;
  onNavigate?: (mapItemId: string) => void;
  removeFavoriteMutation?: (favoriteId: string) => Promise<void>;
}

export interface UseFavoritesActionsReturn {
  navigateToFavorite: (mapItemId: string) => Promise<void>;
  removeFavorite: (favoriteId: string) => Promise<void>;
}

/**
 * Hook for favorites navigation and removal actions.
 */
export function useFavoritesActions(
  options: UseFavoritesActionsOptions
): UseFavoritesActionsReturn {
  const { favorites, setFavorites, onNavigate, removeFavoriteMutation } =
    options;
  const eventBus = useEventBus();

  const navigateToFavorite = useCallback(
    async (mapItemId: string) => {
      eventBus.emit({
        type: 'favorites.navigate',
        payload: { mapItemId },
        source: 'favorites' as const,
        timestamp: new Date(),
      });
      onNavigate?.(mapItemId);
    },
    [eventBus, onNavigate]
  );

  const removeFavorite = useCallback(
    async (favoriteId: string) => {
      if (!removeFavoriteMutation) return;

      const previousFavorites = favorites;
      setFavorites((currentFavorites) =>
        currentFavorites.filter((favorite) => favorite.id !== favoriteId)
      );

      try {
        await removeFavoriteMutation(favoriteId);
        eventBus.emit({
          type: 'favorites.removed',
          payload: { favoriteId },
          source: 'favorites' as const,
          timestamp: new Date(),
        });
      } catch (removalError) {
        setFavorites(previousFavorites);
        throw removalError;
      }
    },
    [favorites, removeFavoriteMutation, eventBus, setFavorites]
  );

  return { navigateToFavorite, removeFavorite };
}
