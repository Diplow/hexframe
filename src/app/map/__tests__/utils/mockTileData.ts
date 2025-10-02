import type { TileData } from "~/app/map/types/tile-data";
import { CoordSystem } from "~/lib/domains/mapping/utils";

export function createMockTileData(overrides?: Partial<TileData>): TileData {
  const defaultCoordId = "0,0";
  const coordinates = CoordSystem.parseId(defaultCoordId);
  
  return {
    metadata: {
      dbId: "test-tile-1",
      coordId: defaultCoordId,
      parentId: undefined,
      coordinates,
      depth: 0,
      ownerId: "user-1",
    },
    data: {
      title: "Test Tile",
      content: "Test description",
      preview: undefined,
      link: "",
      color: "zinc-50",
    },
    state: {
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isExpanded: false,
      isDragOver: false,
      isHovering: false,
    },
    ...overrides,
  };
}