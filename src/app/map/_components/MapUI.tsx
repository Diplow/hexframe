"use client";

import { DynamicMapCanvas, MapLoadingSkeleton } from "~/app/map/Canvas";
import type { TileData } from "~/app/map/types/tile-data";
import { ParentHierarchy } from "~/app/map/Hierarchy";
import { TileActionsProvider } from "~/app/map/Canvas";
import { ChatPanel } from "~/app/map/Chat";
import { useTileSelectForChat } from "~/app/map/_hooks/use-tile-select-for-chat";
import { useMapCache, type MapCacheHook } from '~/app/map/Cache';
import { useRouter } from "next/navigation";
import { useEventBus, type EventBusService } from '~/app/map';

const CACHE_CONFIG = {
  maxAge: 300000,
  backgroundRefreshInterval: 30000,
  enableOptimisticUpdates: true,
  maxDepth: 3,
};

interface MapUIProps {
  centerParam?: string;
}

function _createMapUIHandlers(
  navigateToItem: MapCacheHook['navigateToItem'],
  toggleItemExpansionWithURL: MapCacheHook['toggleItemExpansionWithURL'],
  handleTileSelect: (tileData: TileData, options?: { openInEditMode?: boolean }) => void,
  eventBus: EventBusService,
  router: ReturnType<typeof useRouter>
) {
  const handleNavigate = (tileData: TileData) => {
    void navigateToItem(tileData.metadata.coordId, { pushToHistory: true }).catch((error) => {
      console.warn("Navigation failed, falling back to page navigation", error);
      router.push(`/map?center=${tileData.metadata.dbId}`);
    });
  };

  const handleExpand = (tileData: TileData) => {
    toggleItemExpansionWithURL(tileData.metadata.dbId);
  };

  const handleEditClick = (tileData: TileData) => {
    handleTileSelect(tileData, { openInEditMode: true });
  };

  const handleDeleteClick = (tileData: TileData) => {
    eventBus.emit({
      type: 'map.delete_requested',
      source: 'canvas',
      payload: {
        tileId: tileData.metadata.coordId,
        tileName: tileData.data.name,
      },
      timestamp: new Date(),
    });
  };

  const handleCreateClick = (_tileData: TileData) => {
    // TODO: Implement create functionality
  };

  return { handleNavigate, handleExpand, handleEditClick, handleDeleteClick, handleCreateClick };
}

function _createMapUIParams(
  centerCoordinate: string | null,
  expandedItems: string[]
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries({
      center: centerCoordinate ?? undefined,
      scale: undefined,
      expandedItems: expandedItems.length > 0 ? expandedItems.join(',') : undefined,
      focus: undefined,
    }).filter(([_, value]) => value !== undefined && value !== null)
  );
}

function _renderMapContent(
  isLoading: boolean,
  centerCoordinate: string | null,
  loadingError: Error | null,
  params: Record<string, string | undefined>
) {
  if (isLoading || !centerCoordinate) {
    return <MapLoadingSkeleton message="Loading map..." state="initializing" />;
  }

  if (loadingError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Map not found</h1>
          <p className="mt-2 text-neutral-600">
            {loadingError.message ?? "Unable to load the requested map"}
          </p>
        </div>
      </div>
    );
  }

  const rootItemId = 0;
  const userId = 0;
  const groupId = 0;

  return (
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
  );
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

  const centerCoordinate = center;
  const loadingError = error;
  const params = _createMapUIParams(centerCoordinate, expandedItems);
  const { handleNavigate, handleExpand, handleEditClick, handleDeleteClick, handleCreateClick } = _createMapUIHandlers(
    navigateToItem,
    toggleItemExpansionWithURL,
    handleTileSelect,
    eventBus,
    router
  );

  return (
    <TileActionsProvider
      onSelectClick={handleTileSelect}
      onNavigateClick={handleNavigate}
      onExpandClick={handleExpand}
      onCreateClick={handleCreateClick}
      onEditClick={handleEditClick}
      onDeleteClick={handleDeleteClick}
    >
      <div className="flex h-full w-full relative">
        <div className="flex w-full">
          <ChatPanel className="w-[40%] min-w-[40%] flex-shrink-0 border-r border-[color:var(--stroke-color-950)] overflow-hidden" />

          <div className="flex-1 pr-[130px]">
            {_renderMapContent(isLoading, centerCoordinate, loadingError, params)}
          </div>

          {centerCoordinate && (
            <div className="absolute right-0 top-0 bottom-0">
              <ParentHierarchy
                centerCoordId={centerCoordinate}
                items={{}}
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