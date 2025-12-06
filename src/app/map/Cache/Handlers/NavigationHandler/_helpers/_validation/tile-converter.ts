import type { TileData } from "~/app/map/types";
import { getColor } from "~/app/map/types";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { MapItemType } from "~/lib/domains/mapping/utils";
import { Visibility } from '~/lib/domains/mapping/utils';

/**
 * Convert server item to TileData format
 */
export function convertToTileData(item: {
  id: string;
  coordinates: string;
  title: string;
  content: string;
  preview: string | undefined;
  link: string;
  parentId: string | null;
  ownerId: string;
  depth: number;
  itemType: MapItemType;
}): TileData {
  const coordId = item.coordinates;
  const itemCoords = CoordSystem.parseId(coordId);

  return {
    data: {
      title: item.title,
      content: item.content,
      preview: item.preview ?? '',
      link: item.link ?? '',
      color: getColor(itemCoords),
      visibility: Visibility.PRIVATE,
    },
    metadata: {
      coordId,
      dbId: item.id,
      depth: itemCoords.path.length,
      parentId: item.parentId ?? undefined,
      coordinates: itemCoords,
      ownerId: item.ownerId,
    },
    state: {
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isExpanded: false,
      isDragOver: false,
      isHovering: false,
    },
  };
}
