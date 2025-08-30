/**
 * Service for pre-fetching and transforming user map data
 * to populate MapCacheProvider with initial data
 */

import { adapt, type TileData } from '~/app/map/Services/types';
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
    // Validate userId to prevent NaN errors
    if (!userId || isNaN(userId) || userId <= 0) {
      console.warn('[PreFetch] Invalid userId provided:', {
        userId,
        isNaN: isNaN(userId),
        type: typeof userId
      });
      return null;
    }

    // Starting user map data preload
    
    // Get user's map info
    const userMapResult = await utils.map.user.getUserMap.fetch();
    if (!userMapResult?.success || !userMapResult.map) {
      // No user map found
      return null;
    }

    const mapInfo = userMapResult.map;
    // Found user map

    // Get all items for the user's map
    const itemsResult = await utils.map.getItemsForRootItem.fetch({
      userId,
      groupId,
    });

    if (!itemsResult || itemsResult.length === 0) {
      // No map items found
      return null;
    }

    // Fetched map items

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

    // Successfully preloaded map data

    return result;
  } catch (_error) {
    console.warn('Failed to preload user map data:', _error);
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
    } catch (_error) {
      console.warn('Failed to transform item:', _error);
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
    const dataToSave = {
      ...data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem('hexframe:prefetched-map-data', JSON.stringify(dataToSave));
    // Saved data to sessionStorage
  } catch (_error) {
    console.warn('Failed to save to sessionStorage:', _error);
  }
}

/**
 * Load pre-fetched data from sessionStorage
 */
export function loadPreFetchedData(): PreFetchedMapData | null {
  try {
    // Checking sessionStorage for pre-fetched data
    const stored = sessionStorage.getItem('hexframe:prefetched-map-data');
    if (!stored) {
      // No pre-fetched data found in sessionStorage
      return null;
    }

    const parsed: unknown = JSON.parse(stored);
    
    // Type guard to ensure parsed is the expected structure
    if (typeof parsed !== 'object' || parsed === null) {
      // Invalid data structure in sessionStorage
      return null;
    }
    
    const parsedData = parsed as { timestamp?: number; [key: string]: unknown };
    
    // Check if data is too old (5 minutes)
    const age = Date.now() - (parsedData.timestamp ?? 0);
    if (age > 5 * 60 * 1000) {
      sessionStorage.removeItem('hexframe:prefetched-map-data');
      // Cleared stale data from sessionStorage
      return null;
    }

    // Remove timestamp before returning
    const { timestamp, ...data } = parsedData;
    const typedData = data as unknown as PreFetchedMapData;
    void timestamp; // Mark as intentionally unused
    // Loaded pre-fetched data from sessionStorage
    return typedData;
  } catch (_error) {
    console.warn('Failed to load from sessionStorage:', _error);
    return null;
  }
}

/**
 * Clear pre-fetched data from sessionStorage
 */
export function clearPreFetchedData(): void {
  try {
    sessionStorage.removeItem('hexframe:prefetched-map-data');
    // Cleared pre-fetched data from sessionStorage
  } catch (_error) {
    console.warn('Failed to clear sessionStorage:', _error);
  }
}