"use client";

import { useCallback } from "react";
import { DynamicMapCanvas, MapLoadingSkeleton } from "~/app/map/Canvas";
import type { TileData } from "~/app/map/types/tile-data";
import { ParentHierarchy } from "~/app/map/Hierarchy";
import { TileActionsProvider } from "~/app/map/Canvas/TileActionsContext";
import { ChatPanel } from "~/app/map/Chat/ChatPanel";
import { useTileSelectForChat } from "~/app/map/_hooks/use-tile-select-for-chat";
import { useMapCache } from '~/app/map/Cache';
import { useRouter } from "next/navigation";
import { useEventBus } from '~/app/map';

const CACHE_CONFIG = {
  maxAge: 300000,
  backgroundRefreshInterval: 30000, 
  enableOptimisticUpdates: true,
  maxDepth: 3,
};

interface MapUIProps {
  centerParam?: string;
}

export function MapUI({ centerParam: _centerParam }: MapUIProps) {
  const { handleTileSelect } = useTileSelectForChat();
  const { 
    navigateToItem, 
    toggleItemExpansionWithURL, 
    center,
    isLoading,
    error,
    expandedItems
  } = useMapCache();
  const router = useRouter();
  const eventBus = useEventBus();
  
  // Get values from cache hook
  const centerCoordinate = center;
  const loadingError = error;
  
  const rootItemId = 0; // TODO: Get from map context
  const userId = 0; // TODO: Get from map context  
  const groupId = 0; // TODO: Get from map context
  
  // Simulate URL params from current state - filter out undefined and null values
  const params: Record<string, string | undefined> = Object.fromEntries(
    Object.entries({
      center: centerCoordinate ?? undefined,
      scale: undefined,
      expandedItems: expandedItems.length > 0 ? expandedItems.join(',') : undefined,
      focus: undefined,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );
  
  const handleNavigate = useCallback((tileData: TileData) => {
    void navigateToItem(tileData.metadata.coordId, { pushToHistory: true }).catch((error) => {
      console.warn("Navigation failed, falling back to page navigation", error);
      router.push(`/map?center=${tileData.metadata.dbId}`);
    });
  }, [navigateToItem, router]);
  
  const handleExpand = useCallback((tileData: TileData) => {
    toggleItemExpansionWithURL(tileData.metadata.dbId);
  }, [toggleItemExpansionWithURL]);
  
  const handleEditClick = useCallback((tileData: TileData) => {
    // Open the preview for this tile in edit mode
    handleTileSelect(tileData, { openInEditMode: true });
  }, [handleTileSelect]);
  
  const handleDeleteClick = useCallback((tileData: TileData) => {
    // Request Chat to show delete confirmation widget via event bus
    eventBus.emit({
      type: 'map.delete_requested',
      source: 'canvas',
      payload: {
        tileId: tileData.metadata.coordId,
        tileName: tileData.data.name,
      },
      timestamp: new Date(),
    });
  }, [eventBus]);
  
  return (
    <TileActionsProvider 
      onSelectClick={handleTileSelect}
      onNavigateClick={handleNavigate}
      onExpandClick={handleExpand}
      onCreateClick={() => {
        // Create handler is managed by individual empty tiles
        // This is just for the context menu
      }}
      onEditClick={handleEditClick}
      onDeleteClick={handleDeleteClick}
    >
      <div className="flex h-full w-full relative">
        <div className="flex w-full">
          <ChatPanel className="w-[40%] min-w-[40%] flex-shrink-0 border-r border-[color:var(--stroke-color-950)] overflow-hidden" />
          
          <div className="flex-1 pr-[130px]">
            {isLoading || !centerCoordinate ? (
              <MapLoadingSkeleton message="Loading map..." state="initializing" />
            ) : loadingError ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-semibold">Map not found</h1>
                  <p className="mt-2 text-neutral-600">
                    {loadingError.message ?? "Unable to load the requested map"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <DynamicMapCanvas
                  centerInfo={{
                    center: centerCoordinate,
                    rootItemId,
                    userId,
                    groupId,
                  }}
                  expandedItemIds={params.expandedItems?.split(",") ?? []}
                  urlInfo={{
                    pathname: `/map`,
                    searchParamsString: new URLSearchParams(params as Record<string, string>).toString(),
                    rootItemId: centerCoordinate,
                    scale: params.scale,
                    expandedItems: params.expandedItems,
                    focus: params.focus,
                  }}
                  enableBackgroundSync={true}
                  syncInterval={30000}
                  cacheConfig={CACHE_CONFIG}
                />
              </>
            )}
          </div>
          
          {/* Always render ParentHierarchy to show UserProfileTile */}
          {centerCoordinate && (
            <div className="absolute right-0 top-0 bottom-0">
              <ParentHierarchy
                  centerCoordId={centerCoordinate}
                  items={{}} // Will get items from cache context
                  urlInfo={{
                    pathname: `/map`,
                    searchParamsString: new URLSearchParams(params as Record<string, string>).toString(),
                    rootItemId: centerCoordinate,
                    scale: params.scale,
                    expandedItems: params.expandedItems,
                    focus: params.focus,
                  }}
                />
            </div>
          )}
        </div>
      </div>
    </TileActionsProvider>
  );
}