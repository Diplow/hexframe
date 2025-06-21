import type { MapItemAPIContract } from "~/server/api/types/contracts";
import {
  CoordSystem,
  type Coord,
} from "~/lib/domains/mapping/utils/hex-coordinates";
import { DEFAULT_MAP_COLORS } from "../constants";

export interface TileState {
  isDragged: boolean;
  isHovered: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  isDragOver: boolean;
  isHovering: boolean;
  canExpand?: boolean;
  canEdit?: boolean;
}

function getColor(coordinates: Coord): string {
  if (coordinates.path.length < 1) {
    return "zinc-50";
  }
  return `${DEFAULT_MAP_COLORS[coordinates.path[0]!]}-${
    100 + 100 * coordinates.path.length
  }`;
}

const adapt = (item: MapItemAPIContract) => {
  const coordinates = CoordSystem.parseId(item.coordinates);
  const parentId = CoordSystem.getParentCoord(coordinates);
  return {
    metadata: {
      dbId: item.id,
      coordId: item.coordinates,
      parentId: parentId ? CoordSystem.createId(parentId) : undefined,
      coordinates,
      depth: coordinates.path.length,
      ownerId: item.ownerId, // Add the actual owner ID
    },
    data: {
      name: item.name,
      description: item.descr,
      url: item.url,
      color: getColor(coordinates),
    },
    state: {
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isExpanded: false,
      isDragOver: false,
      isHovering: false,
    } as TileState,
  };
};

type TileData = ReturnType<typeof adapt>;

export { adapt, getColor };
export type { TileData };