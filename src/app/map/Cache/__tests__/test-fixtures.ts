/**
 * Shared test fixtures for Cache tests
 * Provides mock MapItemAPIContract objects with all required fields
 */
import type { MapItemAPIContract } from "~/server/api/types/contracts";
import type { TileData, TileState } from "~/app/map/types";
import { MapItemType } from "~/lib/domains/mapping";
import { Visibility, CoordSystem } from '~/lib/domains/mapping/utils';

/**
 * Creates a mock MapItemAPIContract with sensible defaults.
 * Override any field by passing it in the partial.
 */
export function createMockMapItem(
  partial: Partial<MapItemAPIContract> & { id: string; coordinates: string }
): MapItemAPIContract {
  return {
    title: "Test Item",
    content: "Test Description",
    preview: undefined,
    depth: 1,
    link: "",
    parentId: null,
    itemType: MapItemType.CONTEXT,
    ownerId: "test-owner",
    originId: null,
    visibility: Visibility.PRIVATE,
    ...partial,
  };
}

/**
 * Creates multiple mock items from an array of partials
 */
export function createMockMapItems(
  items: Array<Partial<MapItemAPIContract> & { id: string; coordinates: string }>
): MapItemAPIContract[] {
  return items.map(createMockMapItem);
}

/**
 * Creates a mock TileData object with sensible defaults.
 * Useful for tests that need TileData directly without going through adapt().
 */
export function createMockTileData(
  coordId: string,
  partial?: {
    dbId?: string;
    title?: string;
    content?: string;
    preview?: string;
    link?: string;
    color?: string;
    visibility?: Visibility;
    itemType?: MapItemType;
    ownerId?: string;
    parentId?: string;
  }
): TileData {
  const coordinates = CoordSystem.parseId(coordId);
  return {
    metadata: {
      coordId,
      dbId: partial?.dbId ?? `db-${coordId}`,
      depth: coordinates.path.length,
      parentId: partial?.parentId,
      coordinates,
      ownerId: partial?.ownerId ?? 'test-owner',
    },
    data: {
      title: partial?.title ?? 'Test Item',
      content: partial?.content ?? 'Test Content',
      preview: partial?.preview,
      link: partial?.link ?? '',
      color: partial?.color ?? 'test-color',
      visibility: partial?.visibility ?? Visibility.PRIVATE,
      itemType: partial?.itemType ?? MapItemType.CONTEXT,
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
}
