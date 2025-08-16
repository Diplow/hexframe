import { useCallback } from 'react';
import { useEventBus } from '../Services/EventBus/event-bus-context';
import { useMapCache } from '../Cache/interface';
import type { TileData } from '../types/tile-data';

export function useTileSelectForChat() {
  const eventBus = useEventBus();
  const { getItem } = useMapCache();
  
  const handleTileSelect = useCallback((tileData: TileData, options?: { openInEditMode?: boolean }) => {
    // Get the full tile data from cache
    const fullTileData = getItem(tileData.metadata.coordId) ?? tileData;
    
    // Emit tile selected event via event bus
    eventBus.emit({
      type: 'map.tile_selected',
      source: 'map_cache',
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
      timestamp: new Date(),
    });
  }, [eventBus, getItem]);
  
  return { handleTileSelect };
}