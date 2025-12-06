/**
 * Shared test fixtures for Cache tests
 * Provides mock MapItemAPIContract objects with all required fields
 */
import type { MapItemAPIContract } from "~/server/api/types/contracts";
import { MapItemType } from "~/lib/domains/mapping";
import { Visibility } from '~/lib/domains/mapping/utils';

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
    itemType: MapItemType.BASE,
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
