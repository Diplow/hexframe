"use client";

import type { URLInfo } from "../types/url-info";
import type { TileData } from "../types/tile-data";

interface MapControlsProps {
  urlInfo: URLInfo;
  expandedItemIds: string[];
  minimapItemsData: Record<string, TileData>;
  currentMapCenterCoordId: string;

  // Cache status for future use
  cacheStatus?: {
    isLoading: boolean;
    lastUpdated: number;
    error: Error | null;
    itemCount: number;
  };
}

export function MapControls({
  urlInfo: _urlInfo,
  expandedItemIds: _expandedItemIds,
  minimapItemsData: _minimapItemsData,
  currentMapCenterCoordId: _currentMapCenterCoordId,
  cacheStatus,
}: MapControlsProps) {
  // Simplified controls without action panel
  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Future controls can be added here */}
      {cacheStatus?.isLoading && (
        <div className="rounded bg-white p-2 shadow-md">
          <div className="text-xs text-neutral-500">Syncing...</div>
        </div>
      )}
    </div>
  );
}
