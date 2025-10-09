import "server-only";
import { CoordSystem } from "~/lib/domains/mapping/utils";

export interface MapItem {
  id: string;
  coordinates: string;
  depth: number;
  title: string;
  content: string | null;
  preview?: string | null;
  link: string | null;
  parentId: string | null;
  itemType: string;
  ownerId: string;
  [key: string]: unknown;
}

export interface MapItemWithHierarchy extends MapItem {
  children?: MapItemWithHierarchy[];
  parent?: MapItem | null;
}

// Helper to build hierarchical structure from flat array of items
export function buildHierarchyFromFlatArray(
  items: MapItem[],
  rootCoordId: string,
  depth = 3,
): MapItemWithHierarchy | null {
  // Create a lookup map for efficient access
  const itemsByCoordId = new Map<string, MapItem>();
  items.forEach(item => {
    itemsByCoordId.set(item.coordinates, item);
  });

  // Find the root item
  const rootItem = itemsByCoordId.get(rootCoordId);
  if (!rootItem) return null;

  // Recursive function to build hierarchy
  function buildNode(coordId: string, currentDepth: number): MapItemWithHierarchy | null {
    const item = itemsByCoordId.get(coordId);
    if (!item) return null;

    const node: MapItemWithHierarchy = { ...item };

    // Add children if within depth limit
    if (currentDepth < depth) {
      const children: MapItemWithHierarchy[] = [];

      // Find direct children from the flat array
      for (const candidateItem of items) {
        // Skip self
        if (candidateItem.coordinates === coordId) continue;

        // Check if this item is a direct child (descendant with exactly one level deeper)
        if (CoordSystem.isDescendant(candidateItem.coordinates, coordId)) {
          const candidateDepth = CoordSystem.getDepthFromId(candidateItem.coordinates);
          const currentItemDepth = CoordSystem.getDepthFromId(coordId);

          // Only include direct children (exactly one level deeper)
          if (candidateDepth === currentItemDepth + 1) {
            const childNode = buildNode(candidateItem.coordinates, currentDepth + 1);
            if (childNode) {
              children.push(childNode);
            }
          }
        }
      }

      if (children.length > 0) {
        node.children = children;
      }
    }

    return node;
  }

  return buildNode(rootCoordId, 0);
}