import { useCallback } from 'react';
import { useChatCacheOperations } from '../Chat/_cache/hooks/useChatCacheOperations';
import { useMapCache } from '../Cache/_hooks/use-map-cache';
import type { TileData } from '../types/tile-data';

export function useTileSelectForChat() {
  const { dispatch } = useChatCacheOperations();
  const { items } = useMapCache();
  
  const handleTileSelect = useCallback((tileData: TileData, options?: { openInEditMode?: boolean }) => {
    // Get the full tile data from cache
    const fullTileData = items[tileData.metadata.coordId] ?? tileData;
    
    // Dispatch tile selected event
    dispatch({
      type: 'tile_selected',
      payload: {
        tileId: fullTileData.metadata.coordId,
        tileData: {
          id: fullTileData.metadata.dbId,
          title: fullTileData.data.name,
          content: fullTileData.data.description ?? '',
          coordId: fullTileData.metadata.coordId,
        },
        openInEditMode: options?.openInEditMode,
      },
      id: `select-${Date.now()}`,
      timestamp: new Date(),
      actor: 'user',
    });
  }, [dispatch, items]);
  
  return { handleTileSelect };
}