import { useCallback } from 'react';
import { useChat } from '../Chat/ChatProvider';
import { useMapCache } from '../Cache/map-cache';
import type { TileData } from '../types/tile-data';

export function useTileSelectForChat() {
  const { dispatch } = useChat();
  const { items } = useMapCache();
  
  const handleTileSelect = useCallback((tileData: TileData) => {
    // Get the full tile data from cache
    const fullTileData = items[tileData.metadata.coordId] || tileData;
    
    // Dispatch to chat provider
    dispatch({ 
      type: 'SELECT_TILE', 
      payload: { 
        tileId: fullTileData.metadata.coordId,
        tileData: {
          id: fullTileData.metadata.dbId,
          title: fullTileData.data.name,
          content: fullTileData.data.description || '',
        }
      } 
    });
  }, [dispatch, items]);
  
  return { handleTileSelect };
}