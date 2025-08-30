import { useState, useEffect } from "react";
import { api } from "~/commons/trpc/react";
import { CoordSystem, type Coord } from "~/lib/domains/mapping/utils";
import { adapt, type TileData } from "~/app/map/types/tile-data";
import type { URLInfo } from "~/app/map/types/url-info";
import type { MapItemAPIContract } from "~/server/api/types/contracts";

interface MapCenterInfo {
  center: string;
  rootItemId: number;
  userId: number;
  groupId: number;
}

interface MapDataState {
  centerInfo: MapCenterInfo | null;
  items: Record<string, TileData>;
  scale: number;
  expandedItemIds: string[];
  isLoading: boolean;
  error: Error | null;
}

export function useMapData(urlInfo: URLInfo | null) {
  const [mapData, setMapData] = useState<MapDataState>({
    centerInfo: null,
    items: {},
    scale: 3,
    expandedItemIds: [],
    isLoading: true,
    error: null,
  });

  const utils = api.useUtils();

  useEffect(() => {
    if (!urlInfo) {
      setMapData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    async function fetchMapData(info: URLInfo) {
      try {
        setMapData(prev => ({ ...prev, isLoading: true, error: null }));

        // Fetch root item
        const rootItem = await utils.map.getRootItemById.fetch({
          mapItemId: parseInt(info.rootItemId),
        });

        // Extract coordinates
        const rootCoords = CoordSystem.parseId(rootItem.coordinates);

        // Fetch all items
        const items = await utils.map.getItemsForRootItem.fetch({
          userId: rootCoords.userId,
          groupId: rootCoords.groupId,
        });

        // Process items
        const { processedItems, expandedItemIds } = processMapItems(
          items,
          info.expandedItems
        );

        // Build center info
        const centerInfo = buildCenterInfo(rootItem, info, rootCoords);

        setMapData({
          centerInfo,
          items: processedItems,
          scale: info.scale ? parseInt(info.scale) : 3,
          expandedItemIds,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setMapData(prev => ({
          ...prev,
          isLoading: false,
          error: error as Error,
        }));
      }
    }

    void fetchMapData(urlInfo);
  }, [urlInfo, utils]);

  return mapData;
}

function processMapItems(items: MapItemAPIContract[], expandedItemsParam?: string) {
  const expandedItemIdsFromUrl = expandedItemsParam
    ? expandedItemsParam.split(",")
    : [];

  const processedItems = items
    .map(adapt)
    .filter((item) => !item.metadata.coordinates.path.includes(0))
    .reduce(
      (acc, item) => {
        acc[item.metadata.coordId] = item;
        return acc;
      },
      {} as Record<string, TileData>
    );

  const expandedItemIds = items
    .filter((item) => expandedItemIdsFromUrl.includes(item.id))
    .map((item) => item.id);

  return { processedItems, expandedItemIds };
}

function buildCenterInfo(
  rootItem: MapItemAPIContract,
  urlInfo: URLInfo,
  rootCoords: Coord
): MapCenterInfo {
  return {
    center: rootItem.coordinates,
    rootItemId: parseInt(urlInfo.rootItemId),
    userId: rootCoords.userId,
    groupId: rootCoords.groupId,
  };
}