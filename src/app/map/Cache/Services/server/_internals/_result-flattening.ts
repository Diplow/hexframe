import type { MapItemType } from "~/lib/domains/mapping/utils";

export interface FetchedMapItem {
  id: string;
  coordinates: string;
  depth: number;
  title: string;
  content: string;
  preview: string | undefined;
  link: string;
  parentId: string | null;
  itemType: MapItemType;
  ownerId: string;
}

/**
 * Flattens API response which may contain mixed arrays/objects
 * Some items might be objects, some might be arrays - this handles both
 */
export function _flattenMixedResult(
  result: unknown
): FetchedMapItem[] {
  if (Array.isArray(result)) {
    // Flatten nested arrays: [item1, [item2, item3]] -> [item1, item2, item3]
    const flattened: FetchedMapItem[] = [];
    for (const item of result) {
      if (Array.isArray(item)) {
        flattened.push(...(item as FetchedMapItem[]));
      } else {
        flattened.push(item as FetchedMapItem);
      }
    }
    return flattened;
  }

  return [result as FetchedMapItem];
}
