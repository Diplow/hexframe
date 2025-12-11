'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Favorite } from '~/lib/domains/iam/_repositories';
import type { TileDataMap } from '~/app/map/Favorites/_utils/favorites-filters';

export interface UseFavoritesStateOptions {
  initialFavorites?: Favorite[];
  initialTileData?: TileDataMap;
  initialError?: string | null;
}

export interface UseFavoritesStateReturn {
  favorites: Favorite[];
  setFavorites: React.Dispatch<React.SetStateAction<Favorite[]>>;
  tileData: TileDataMap;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  refreshFavorites: () => void;
}

/**
 * Hook for managing favorites core data state.
 */
export function useFavoritesState(
  options: UseFavoritesStateOptions = {}
): UseFavoritesStateReturn {
  const {
    initialFavorites = [],
    initialTileData = {},
    initialError = null,
  } = options;

  const [favorites, setFavorites] = useState<Favorite[]>(initialFavorites);
  const [tileData, setTileData] = useState<TileDataMap>(initialTileData);
  const [isLoading, setIsLoading] = useState(initialFavorites.length === 0);
  const [error, setError] = useState<string | null>(initialError);

  const refreshFavorites = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, []);

  useEffect(() => {
    if (initialFavorites.length === 0 && isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialFavorites.length, isLoading]);

  useEffect(() => {
    if (initialFavorites.length > 0) {
      setFavorites(initialFavorites);
      setIsLoading(false);
    }
  }, [initialFavorites]);

  useEffect(() => {
    if (Object.keys(initialTileData).length > 0) {
      setTileData(initialTileData);
    }
  }, [initialTileData]);

  return {
    favorites,
    setFavorites,
    tileData,
    isLoading,
    setIsLoading,
    error,
    setError,
    refreshFavorites,
  };
}
