"use client";

import { DynamicMapCanvas } from "../Canvas";
import { ParentHierarchy } from "../Controls/ParentHierarchy/parent-hierarchy";
import { MapControls } from "../Controls";
import { TileActionsProvider } from "../Canvas/TileActionsContext";
import { Toolbox } from "../Controls/Toolbox/Toolbox";
import { ToolStateManager } from "../Controls/Toolbox/ToolStateManager";
import { MapContent } from "./MapContent";
import { ChatPanel } from "../Chat/ChatPanel";
import { OfflineIndicator } from "./offline-indicator";
import { useTileSelectForChat } from "../hooks/useTileSelectForChat";

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
}: MapPageContentProps) {
  const { handleTileSelect } = useTileSelectForChat();
  
  return (
    <TileActionsProvider onSelectClick={handleTileSelect}>
      <ToolStateManager mapCenterCoordId={centerCoordinate}>
        <MapContent>
          {/* New flex layout for desktop: Chat -> Toolbox -> Canvas -> Hierarchy */}
          <div className="flex h-full w-full relative">
            {/* Main content area */}
            <div className="flex flex-1 pr-[130px]">
              {/* Flexible Left: Chat takes remaining space */}
              <ChatPanel className="flex-1 border-r border-[color:var(--stroke-color-950)] overflow-hidden" />
              
              {/* Fixed: Toolbox */}
              <div className="relative">
                <Toolbox />
              </div>
              
              {/* Min-width Center: Canvas (scale 3 tile = 400px) */}
              <div className="flex-1 flex-shrink-0" style={{ minWidth: '400px' }}>
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
              </div>
            </div>
            
            {/* Fixed Right: Hierarchy - positioned absolutely */}
            <div className="absolute right-0 top-0 bottom-0">
              <ParentHierarchy
                centerCoordId={centerCoordinate}
                items={{}} // Will get items from cache context
                urlInfo={{
                  pathname: `/map`,
                  searchParamsString: new URLSearchParams(params as Record<string, string>).toString(),
                  rootItemId: params.center!,
                  scale: params.scale,
                  expandedItems: params.expandedItems,
                  focus: params.focus,
                }}
              />
            </div>
          </div>
          
          <OfflineIndicator isOffline={isOffline} />
        </MapContent>
      </ToolStateManager>
    </TileActionsProvider>
  );
}