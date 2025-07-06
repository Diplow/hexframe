"use client";

import { useCallback } from "react";
import { DynamicMapCanvas } from "../Canvas";
import type { TileData } from "../types/tile-data";
import { ParentHierarchy } from "../Controls/ParentHierarchy/parent-hierarchy";
import { MapControls } from "../Controls";
import { TileActionsProvider } from "../Canvas/TileActionsContext";
import { MapContent } from "./MapContent";
import { ChatPanel } from "../Chat/ChatPanel";
import { OfflineIndicator } from "./offline-indicator";
import { useTileSelectForChat } from "../hooks/useTileSelectForChat";
import { useChatCacheOperations } from "../Chat/_cache/hooks/useChatCacheOperations";
import { useMapCache } from "../Cache/map-cache";
import { useRouter } from "next/navigation";
import { MapLoadingSkeleton } from "../Canvas/LifeCycle/loading-skeleton";

interface MapPageContentProps {
  centerCoordinate: string;
  params: {
    center?: string;
    scale?: string;
    expandedItems?: string;
    focus?: string;
    offline?: string;
  };
  rootItemId: number;
  userId: number;
  groupId: number;
  isOffline: boolean;
  isLoading?: boolean;
  loadingError?: Error | null;
}

const CACHE_CONFIG = {
  maxAge: 300000, // 5 minutes
  backgroundRefreshInterval: 30000, // 30 seconds
  enableOptimisticUpdates: true,
  maxDepth: 3, // Hierarchical loading depth
};

export function MapPageContent({
  centerCoordinate,
  params,
  rootItemId,
  userId,
  groupId,
  isOffline,
  isLoading = false,
  loadingError = null,
}: MapPageContentProps) {
  const { handleTileSelect } = useTileSelectForChat();
  const { navigateToItem, toggleItemExpansionWithURL } = useMapCache();
  const router = useRouter();
  const { dispatch: chatDispatch } = useChatCacheOperations();
  
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
    // Show delete confirmation widget in chat
    chatDispatch({
      type: 'operation_started',
      payload: {
        operation: 'delete',
        tileId: tileData.metadata.coordId,
        data: {
          tileName: tileData.data.name,
        },
      },
      id: `delete-${Date.now()}`,
      timestamp: new Date(),
      actor: 'user',
    });
  }, [chatDispatch]);
  
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
      <MapContent>
          <div className="flex h-full w-full relative">
            <div className="flex w-full">
              <ChatPanel className="w-[40%] min-w-[40%] flex-shrink-0 border-r border-[color:var(--stroke-color-950)] overflow-hidden" />
              
              <div className="flex-1 pr-[130px]">
                {isLoading ? (
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
                        rootItemId: params.center!,
                        scale: params.scale,
                        expandedItems: params.expandedItems,
                        focus: params.focus,
                      }}
                      enableBackgroundSync={true}
                      syncInterval={30000}
                      cacheConfig={CACHE_CONFIG}
                    />
                    <MapControls
                      urlInfo={{
                        pathname: `/map`,
                        searchParamsString: new URLSearchParams(params as Record<string, string>).toString(),
                        rootItemId: params.center!,
                        scale: params.scale,
                        expandedItems: params.expandedItems,
                        focus: params.focus,
                      }}
                      expandedItemIds={params.expandedItems?.split(",") ?? []}
                      minimapItemsData={{}} // Will get items from cache context
                      currentMapCenterCoordId={centerCoordinate}
                      cacheStatus={{
                        isLoading: false, // Cache will manage its own loading state
                        lastUpdated: Date.now(),
                        error: null,
                        itemCount: 0,
                      }}
                    />
                  </>
                )}
              </div>
              
              {!isLoading && !loadingError && (
                <div className="absolute right-0 top-0 bottom-0">
                  <ParentHierarchy
                    centerCoordId={centerCoordinate}
                    items={{}} // Will get items from cache context
                    urlInfo={{
                      pathname: `/map`,
                      searchParamsString: new URLSearchParams(params as Record<string, string>).toString(),
                      rootItemId: params.center ?? centerCoordinate,
                      scale: params.scale,
                      expandedItems: params.expandedItems,
                      focus: params.focus,
                    }}
                  />
                </div>
              )}
            </div>
            
          </div>
          
          <OfflineIndicator isOffline={isOffline} />
        </MapContent>
    </TileActionsProvider>
  );
}