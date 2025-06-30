import { notFound, redirect } from "next/navigation";
import { api } from "~/commons/trpc/server";
import { StaticMapCanvas, type CenterInfo } from "./Canvas/index";
import { type MapItemAPIContract } from "~/server/api/types/contracts";
import { adapt, type TileData } from "~/app/map/types/tile-data";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import { type URLInfo } from "~/app/map/types/url-info";
import ErrorComponent from "~/app/map/error";
import { ParentHierarchy } from "./Controls/ParentHierarchy/parent-hierarchy";
import { testLogger } from "~/lib/test-logger";

interface StaticMapPageProps {
  searchParams: Promise<{
    center?: string;
    scale?: string;
    expandedItems?: string;
    focus?: string;
  }>;
}

export default async function StaticMapPage({
  searchParams,
}: StaticMapPageProps) {
  const searchParamsString = await searchParams;
  const rootItemId = searchParamsString.center;
  
  if (!rootItemId) {
    return <div>No map center specified</div>;
  }

  const urlInfo: URLInfo = {
    pathname: `/static/map`,
    searchParamsString: new URLSearchParams(
      searchParamsString as Record<string, string>,
    ).toString(),
    rootItemId,
    scale: searchParamsString.scale,
    expandedItems: searchParamsString.expandedItems,
    focus: searchParamsString.focus,
  };

  const { data: rootItem } = await getRootItemData(urlInfo.rootItemId);

  if (!rootItem) {
    testLogger.error(`Root item not found for ID: ${urlInfo.rootItemId}`);
    return notFound();
  }

  testLogger.info('StaticMapPage: Root item loaded', {
    rootItemId: urlInfo.rootItemId,
    rootCoordinates: rootItem.coordinates,
    rootName: rootItem.name,
    urlInfo
  });

  // Handle initial focus parameter - default to root item coordinates
  if (!urlInfo.focus) {
    const defaultFocus = rootItem.coordinates;
    const currentPath = `/static/map`;
    const newSearchParams = new URLSearchParams(searchParamsString as string);
    newSearchParams.set("center", urlInfo.rootItemId);
    newSearchParams.set("focus", defaultFocus);
    testLogger.info('Redirecting to set default focus', { defaultFocus });
    return redirect(`${currentPath}?${newSearchParams.toString()}`);
  }

  const { data: items, error: itemsError } = await getMapItems(
    urlInfo.rootItemId,
  );

  if (itemsError) {
    testLogger.error('Failed to load map items', itemsError);
    return <ErrorComponent error={itemsError} reset={() => { /* Static page has no reset */ }} />;
  }

  if (!items) {
    testLogger.error('No items returned from API');
    return null;
  }

  testLogger.info('StaticMapPage: Map items loaded', {
    itemCount: items.length,
    focus: urlInfo.focus,
    expandedItems: urlInfo.expandedItems
  });

  const { scale, expandedItemIds } = initMapParameters(urlInfo, items);
  const mapItems = formatItems(items);
  
  testLogger.info('StaticMapPage: Parameters initialized', {
    scale,
    expandedItemIds,
    mapItemCount: Object.keys(mapItems).length
  });

  // Extract userId and groupId from root item coordinates
  const rootCoords = CoordSystem.parseId(rootItem.coordinates);

  const centerInfo: CenterInfo = {
    center: rootItem.coordinates,
    rootItemId: parseInt(urlInfo.rootItemId),
    userId: rootCoords.userId,
    groupId: rootCoords.groupId,
  };

  // Server-side rendered static map
  return (
    <div className="relative flex h-screen w-full flex-col bg-neutral-900">
      <StaticMapCanvas
        centerInfo={centerInfo}
        items={mapItems}
        scale={scale}
        expandedItemIds={expandedItemIds}
        urlInfo={urlInfo}
        currentUserId={centerInfo.userId}
      />
      <ParentHierarchy
        centerCoordId={centerInfo.center}
        items={mapItems}
        urlInfo={urlInfo}
      />
    </div>
  );
}

async function getMapItems(rootItemId: string) {
  try {
    // First get the root item to extract userId and groupId
    const rootItem = await api.map.getRootItemById({
      mapItemId: parseInt(rootItemId),
    });

    const rootCoords = CoordSystem.parseId(rootItem.coordinates);

    const items = await api.map.getItemsForRootItem({
      userId: rootCoords.userId,
      groupId: rootCoords.groupId,
    });
    return { data: items, error: null };
  } catch (error) {
    console.error("Error loading map items:", error);
    return { data: null, error: error as Error };
  }
}

async function getRootItemData(rootItemId: string) {
  try {
    const rootItem = await api.map.getRootItemById({
      mapItemId: parseInt(rootItemId),
    });
    return { data: rootItem, error: null };
  } catch (error) {
    console.error("Error loading root item:", error);
    return { data: null, error: error as Error };
  }
}

function initMapParameters(urlInfo: URLInfo, items: MapItemAPIContract[]) {
  const expandedItemIdsFromUrl = urlInfo.expandedItems
    ? urlInfo.expandedItems.split(",")
    : [];
  return {
    scale: urlInfo.scale ? parseInt(urlInfo.scale) : 3,
    expandedItemIds: items
      .filter((item) => expandedItemIdsFromUrl.includes(item.id))
      .map((item) => item.id),
  };
}

const formatItems = (items: MapItemAPIContract[]) => {
  const itemsById = items.map(adapt).reduce(
    (acc, item) => {
      if (item.metadata.coordinates.path.includes(0)) {
        return acc;
      }
      acc[item.metadata.coordId] = item;
      return acc;
    },
    {} as Record<string, TileData>,
  );
  return itemsById;
};
