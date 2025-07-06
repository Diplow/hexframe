/**
 * Service for pre-fetching and transforming user map data
 * to populate MapCacheProvider with initial data
 */

import { adapt, type TileData } from '../../types/tile-data';
import type { MapItemAPIContract } from '~/server/api/types/contracts';
import type { api } from '~/commons/trpc/react';

export interface PreFetchedMapData {
  initialItems: Record<string, TileData>;
  centerCoordinate: string;
  mapInfo: {
    id: number;
    name: string;
  };
}

/**
 * Pre-fetch user map data including all tiles
 * Note: This function should be called from a React component context to access tRPC utils
 */
export async function preloadUserMapData(
  userId: number,
  groupId = 0,
  utils: ReturnType<typeof api.useUtils>
): Promise<PreFetchedMapData | null> {
  try {
    console.log('[PreFetch] Starting user map data preload for user:', userId);
    
    // Get user's map info
    const userMapResult = await utils.map.user.getUserMap.fetch();
    if (!userMapResult?.success || !userMapResult.map) {
      console.warn('[PreFetch] No user map found');
      return null;
    }

    const mapInfo = userMapResult.map;
    console.log('[PreFetch] Found user map:', mapInfo);

    // Get all items for the user's map
    const itemsResult = await utils.map.getItemsForRootItem.fetch({
      userId,
      groupId,
    });

    if (!itemsResult || itemsResult.length === 0) {
      console.warn('[PreFetch] No map items found');
      return null;
    }

    console.log('[PreFetch] Fetched', itemsResult.length, 'map items');

    // Transform API items to TileData format
    const initialItems = transformApiItemsToTileData(itemsResult);

    // Find the root item coordinate (the user's map center)
    const rootItem = itemsResult.find(item => item.id === mapInfo.id.toString());
    const centerCoordinate = rootItem?.coordinates ?? `${userId},${groupId}`;

    const result: PreFetchedMapData = {
      initialItems,
      centerCoordinate,
      mapInfo,
    };

    console.log('[PreFetch] Successfully preloaded map data:', {
      itemCount: Object.keys(initialItems).length,
      centerCoordinate,
      mapName: mapInfo.name,
    });

    return result;
  } catch (error) {
    console.error('[PreFetch] Failed to preload user map data:', error);
    return null;
  }
}

/**
 * Transform API map items to TileData format
 */
export function transformApiItemsToTileData(
  apiItems: MapItemAPIContract[]
): Record<string, TileData> {
  const tileDataRecord: Record<string, TileData> = {};

  for (const apiItem of apiItems) {
    try {
      // Use the existing TileData adapter
      const tileData = adapt(apiItem);
      
      // Store by coordinate ID for map cache
      tileDataRecord[tileData.metadata.coordId] = tileData;
    } catch (error) {
      console.warn('[PreFetch] Failed to transform item:', apiItem.id, error);
      // Continue with other items
    }
  }

  return tileDataRecord;
}

/**
 * Save pre-fetched data to sessionStorage for persistence across page loads
 */
export function savePreFetchedData(data: PreFetchedMapData): void {
  try {
    sessionStorage.setItem('hexframe:prefetched-map-data', JSON.stringify({
      ...data,
      timestamp: Date.now(),
    }));
    console.log('[PreFetch] Saved data to sessionStorage');
  } catch (error) {
    console.warn('[PreFetch] Failed to save to sessionStorage:', error);
  }
}

/**
 * Load pre-fetched data from sessionStorage
 */
export function loadPreFetchedData(): PreFetchedMapData | null {
  try {
    const stored = sessionStorage.getItem('hexframe:prefetched-map-data');
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    
    // Type guard to ensure parsed is the expected structure
    if (typeof parsed !== 'object' || parsed === null) return null;
    
    const parsedData = parsed as { timestamp?: number; [key: string]: unknown };
    
    // Check if data is too old (5 minutes)
    const age = Date.now() - (parsedData.timestamp ?? 0);
    if (age > 5 * 60 * 1000) {
      sessionStorage.removeItem('hexframe:prefetched-map-data');
      console.log('[PreFetch] Cleared stale data from sessionStorage');
      return null;
    }

    // Remove timestamp before returning
    const { timestamp: _timestamp, ...data } = parsedData;
    console.log('[PreFetch] Loaded data from sessionStorage');
    return data as unknown as PreFetchedMapData;
  } catch (error) {
    console.warn('[PreFetch] Failed to load from sessionStorage:', error);
    return null;
  }
}

/**
 * Clear pre-fetched data from sessionStorage
 */
export function clearPreFetchedData(): void {
  try {
    sessionStorage.removeItem('hexframe:prefetched-map-data');
    console.log('[PreFetch] Cleared pre-fetched data');
  } catch (error) {
    console.warn('[PreFetch] Failed to clear sessionStorage:', error);
  }
}