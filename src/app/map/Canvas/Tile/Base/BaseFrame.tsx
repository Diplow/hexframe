import { getColorFromItem } from "~/app/map/Canvas/Tile";
import { BaseTileLayout } from "~/app/map/Canvas/Tile/Base/BaseTileLayout";
import type { TileScale } from "~/app/map/Canvas/Tile/Base/BaseTileLayout";
import { DynamicEmptyTile } from "~/app/map/Canvas/Tile/Empty/empty";
import { DynamicItemTile } from "~/app/map/Canvas/Tile/Item/item";
import { BaseEmptyTile } from "~/app/map/Canvas/Tile/Base/_components/BaseEmptyTile";
import { BaseItemTile } from "~/app/map/Canvas/Tile/Base/_components/BaseItemTile";
import type { TileData, URLInfo } from "~/app/map/types";
import { CoordSystem } from "~/lib/domains/mapping/utils";

export interface BaseFrameProps {
  center: string;
  mapItems: Record<string, TileData>;
  baseHexSize?: number;
  expandedItemIds?: string[];
  scale?: TileScale;
  urlInfo: URLInfo;
  interactive?: boolean;
  currentUserId?: number;
  isDarkMode?: boolean;
}

export const BaseFrame = ({
  center,
  mapItems,
  baseHexSize = 50,
  expandedItemIds = [],
  scale = 3,
  urlInfo,
  interactive = true,
  currentUserId,
  isDarkMode = false,
}: BaseFrameProps) => {
  const centerItem = mapItems[center];

  const isExpanded = centerItem
    ? expandedItemIds.includes(centerItem.metadata.dbId)
    : false;

  if (!centerItem) {
    // Find parent item for context
    const parentCoords = center.split(":").slice(0, -1).join(":");
    const parentItem = parentCoords ? mapItems[parentCoords] : undefined;

    return interactive ? (
      <DynamicEmptyTile
        coordId={center}
        scale={scale}
        baseHexSize={baseHexSize}
        urlInfo={urlInfo}
        parentItem={
          parentItem
            ? {
                id: parentItem.metadata.dbId,
                name: parentItem.data.title,
              }
            : undefined
        }
        interactive={interactive}
        currentUserId={currentUserId}
      />
    ) : (
      <BaseEmptyTile
        coordId={center}
        scale={scale}
        baseHexSize={baseHexSize}
        isDarkMode={isDarkMode}
      />
    );
  }

  // Calculate if centerItem has children
  const centerItemChildCoordIds = CoordSystem.getChildCoordsFromId(
    centerItem.metadata.coordId,
  );
  const centerItemHasChildren = centerItemChildCoordIds.some(
    (childId) => mapItems[childId],
  );

  if (!isExpanded) {
    return interactive ? (
      <DynamicItemTile
        item={centerItem}
        scale={scale}
        baseHexSize={baseHexSize}
        allExpandedItemIds={expandedItemIds}
        hasChildren={centerItemHasChildren}
        isCenter={centerItem.metadata.dbId === urlInfo.rootItemId}
        urlInfo={urlInfo}
        interactive={interactive}
      />
    ) : (
      <BaseItemTile
        item={centerItem}
        scale={scale}
        baseHexSize={baseHexSize}
        isExpanded={false}
        isDarkMode={isDarkMode}
      />
    );
  }

  const [NW, NE, E, SE, SW, W] = CoordSystem.getChildCoordsFromId(center);

  const marginTopValue =
    scale === 2 ? baseHexSize / 2 : (baseHexSize / 2) * Math.pow(3, scale - 2);
  const marginTop = {
    marginTop: `-${marginTopValue}px`,
  };

  const nextScale = (scale - 1) as TileScale;

  // Generate test ID for the frame
  const frameTestId = `frame-${centerItem.metadata.coordinates.userId}-${centerItem.metadata.coordinates.groupId}-${centerItem.metadata.coordinates.path.join("-")}`;
  
  const frame = (
    <div className="flex flex-col items-center justify-center" data-testid={frameTestId}>
      <div className="flex justify-center p-0">
        <RenderChild
          coords={NW}
          baseHexSize={baseHexSize}
          mapItems={mapItems}
          expandedItemIds={expandedItemIds}
          scale={nextScale}
          urlInfo={urlInfo}
          interactive={interactive}
          currentUserId={currentUserId}
          isDarkMode={isDarkMode}
        />
        <RenderChild
          coords={NE}
          mapItems={mapItems}
          baseHexSize={baseHexSize}
          expandedItemIds={expandedItemIds}
          scale={nextScale}
          urlInfo={urlInfo}
          interactive={interactive}
          currentUserId={currentUserId}
          isDarkMode={isDarkMode}
        />
      </div>
      <div className="flex justify-center" style={marginTop}>
        <RenderChild
          coords={W}
          baseHexSize={baseHexSize}
          mapItems={mapItems}
          expandedItemIds={expandedItemIds}
          scale={nextScale}
          urlInfo={urlInfo}
          interactive={interactive}
          currentUserId={currentUserId}
          isDarkMode={isDarkMode}
        />
        <div className="flex flex-col">
          {interactive ? (
            <DynamicItemTile
              item={centerItem}
              scale={nextScale}
              allExpandedItemIds={expandedItemIds}
              hasChildren={centerItemHasChildren}
              isCenter={centerItem.metadata.dbId === urlInfo.rootItemId}
              urlInfo={urlInfo}
              interactive={interactive}
            />
          ) : (
            <BaseItemTile
              item={centerItem}
              scale={nextScale}
              isExpanded={true}
              isDarkMode={isDarkMode}
            />
          )}
        </div>
        <RenderChild
          coords={E}
          baseHexSize={baseHexSize}
          mapItems={mapItems}
          expandedItemIds={expandedItemIds}
          scale={nextScale}
          urlInfo={urlInfo}
          interactive={interactive}
          currentUserId={currentUserId}
          isDarkMode={isDarkMode}
        />
      </div>
      <div className="flex justify-center" style={marginTop}>
        <RenderChild
          coords={SW}
          baseHexSize={baseHexSize}
          mapItems={mapItems}
          expandedItemIds={expandedItemIds}
          scale={nextScale}
          urlInfo={urlInfo}
          interactive={interactive}
          currentUserId={currentUserId}
          isDarkMode={isDarkMode}
        />
        <RenderChild
          coords={SE}
          baseHexSize={baseHexSize}
          mapItems={mapItems}
          expandedItemIds={expandedItemIds}
          scale={nextScale}
          urlInfo={urlInfo}
          interactive={interactive}
          currentUserId={currentUserId}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );

  return (
    <BaseTileLayout
      scale={scale}
      color={getColorFromItem(centerItem)}
      coordId={center}
      _shallow={true}
    >
      <div
        className="scale-90 transform"
        style={{ position: "relative", zIndex: 5 }}
      >
        {frame}
      </div>
    </BaseTileLayout>
  );
};

interface RenderChildProps {
  coords: string;
  mapItems: Record<string, TileData>;
  baseHexSize?: number;
  expandedItemIds?: string[];
  scale: TileScale;
  urlInfo: URLInfo;
  interactive?: boolean;
  currentUserId?: number;
  isDarkMode?: boolean;
}

const RenderChild = ({
  coords,
  mapItems,
  baseHexSize = 50,
  expandedItemIds = [],
  scale,
  urlInfo,
  interactive = true,
  currentUserId,
  isDarkMode = false,
}: RenderChildProps) => {
  const item = mapItems[coords];
  const isExpanded = item
    ? expandedItemIds.includes(item.metadata.dbId)
    : false;

  if (!item) {
    // Find parent item for context
    const parentCoords = CoordSystem.getParentCoord(
      CoordSystem.parseId(coords),
    );
    if (!parentCoords) {
      throw new Error("Failed to get parent coordinates");
    }
    const parentCoordsId = CoordSystem.createId(parentCoords);
    const parentItem = parentCoordsId ? mapItems[parentCoordsId] : undefined;

    return interactive ? (
      <DynamicEmptyTile
        coordId={coords}
        scale={scale}
        baseHexSize={baseHexSize}
        urlInfo={urlInfo}
        parentItem={
          parentItem
            ? {
                id: parentItem.metadata.dbId,
                name: parentItem.data.title,
              }
            : undefined
        }
        interactive={interactive}
        currentUserId={currentUserId}
      />
    ) : (
      <BaseEmptyTile
        coordId={coords}
        scale={scale}
        baseHexSize={baseHexSize}
        isDarkMode={isDarkMode}
      />
    );
  }

  // Calculate if the current child item has children
  const childItemChildCoordIds = CoordSystem.getChildCoordsFromId(
    item.metadata.coordId,
  );
  const itemHasChildren = childItemChildCoordIds.some(
    (childId) => mapItems[childId],
  );

  // Only allow expansion if we can reduce scale further (scale > 1)
  if (isExpanded && scale > 1) {
    return (
      <BaseFrame
        center={coords}
        mapItems={mapItems}
        expandedItemIds={expandedItemIds}
        scale={scale}
        urlInfo={urlInfo}
        interactive={interactive}
        currentUserId={currentUserId}
        isDarkMode={isDarkMode}
      />
    );
  }

  return interactive ? (
    <DynamicItemTile
      item={item}
      scale={scale}
      allExpandedItemIds={expandedItemIds}
      hasChildren={itemHasChildren}
      isCenter={false}
      urlInfo={urlInfo}
      interactive={interactive}
    />
  ) : (
    <BaseItemTile
      item={item}
      scale={scale}
      isExpanded={false}
      isDarkMode={isDarkMode}
    />
  );
};