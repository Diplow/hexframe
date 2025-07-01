import Link from "next/link";
import type { TileData } from "~/app/map/types/tile-data";
import { StaticBaseTileLayout } from "~/app/static/map/Tile/Base/base";
import type { URLInfo } from "~/app/map/types/url-info";
import {
  HIERARCHY_TILE_BASE_SIZE,
  HIERARCHY_TILE_SCALE,
} from "~/app/map/constants";
import { getTextColorForDepth } from "~/app/map/types/theme-colors";

export interface HierarchyTileProps {
  item: TileData;
  hierarchy: TileData[];
  itemIndex: number;
  urlInfo: URLInfo;
}

const _createNavigationUrl = (
  item: TileData,
  _urlInfo: URLInfo,
  _hierarchy: TileData[],
  _itemIndex: number,
): string => {
  // Navigate to map with center as query param
  return `/static/map?center=${item.metadata.dbId}`;
};

export const HierarchyTile = ({
  item,
  hierarchy,
  itemIndex,
  urlInfo,
}: HierarchyTileProps) => {
  const navigationUrl = _createNavigationUrl(
    item,
    urlInfo,
    hierarchy,
    itemIndex,
  );

  return (
    <Link
      href={navigationUrl}
      aria-label={`Navigate to ${item.data.name}`}
      data-testid="hierarchy-tile"
      className="group relative flex-shrink-0 cursor-pointer rounded-lg border-none bg-transparent hover:scale-105 focus:scale-105"
    >
      <div className="pointer-events-none">
        <StaticBaseTileLayout
          coordId={item.metadata.coordId}
          scale={HIERARCHY_TILE_SCALE}
          color={item.data.color}
          baseHexSize={HIERARCHY_TILE_BASE_SIZE}
          isFocusable={false}
        >
          <HierarchyTileContent item={item} />
        </StaticBaseTileLayout>
      </div>
    </Link>
  );
};

const HierarchyTileContent = ({ item }: { item: TileData }) => {
  const textColorClass = getTextColorForDepth(item.metadata.depth);
  
  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <span
        className={`text-center text-xs font-medium leading-tight ${textColorClass}`}
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
        title={item.data.name}
      >
        {item.data.name}
      </span>
    </div>
  );
};
