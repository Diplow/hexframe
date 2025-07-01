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
import { useChat } from "../Chat/ChatProvider";

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
  const { state: chatState } = useChat();
  
  return (
    <TileActionsProvider onSelectClick={handleTileSelect}>
      <ToolStateManager mapCenterCoordId={centerCoordinate}>
        <MapContent>
          {/* New flex layout for desktop */}
          <div className="flex h-full w-full">
            {/* Fixed Left: Toolbox */}
            <Toolbox />
            
            {/* Min-width Center: Canvas (scale 3 tile = 400px) */}
            <div className="flex-shrink-0" style={{ minWidth: '400px' }}>
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
            
            {/* Fixed Right: Hierarchy */}
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
            
            {/* Flexible: Chat takes remaining space */}
            {chatState.isPanelOpen && (
              <ChatPanel className="flex-1 border-l overflow-hidden" />
            )}
          </div>
          
          <OfflineIndicator isOffline={isOffline} />
        </MapContent>
      </ToolStateManager>
    </TileActionsProvider>
  );
}