import type { MapItemAPIContract } from "~/server/api";
import {
  CoordSystem,
  type Coord,
} from "~/lib/domains/mapping/utils";
import { Direction } from "~/app/map/constants";
import { getSemanticColorClass } from "~/app/map/types/theme-colors";

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
  // Root tile (center)
  if (coordinates.path.length < 1) {
    return getSemanticColorClass(Direction.Center, 0);
  }

  // Direction 0 orchestration tile - use neutral color
  const lastDirection = coordinates.path[coordinates.path.length - 1];
  if (lastDirection === Direction.Center) {
    return "orchestration"; // Custom class with dark mode support (zinc-300 light, zinc-600 dark)
  }

  // Get direction from first path element
  const direction = coordinates.path[0]!;
  const depth = coordinates.path.length;

  return getSemanticColorClass(direction, depth);
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
      ownerId: item.ownerId,
    },
    data: {
      title: item.title,
      content: item.content,
      preview: item.preview ?? undefined,
      link: item.link,
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