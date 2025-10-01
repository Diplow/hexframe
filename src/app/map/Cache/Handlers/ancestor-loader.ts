import type { Dispatch } from "react";
import type { CacheAction } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { ServerService } from "~/app/map/Cache/Services/types";
import type { TileData } from "~/app/map/types";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import { getColor } from "~/app/map/types";

export interface AncestorCheckResult {
  hasAllAncestors: boolean;
  missingLevels: string[];
}

/**
 * Check if all ancestors exist for a given coordinate
 */
export function checkAncestors(
  coordId: string,
  existingItems: Record<string, TileData | undefined> | Array<{ coordinates: string }>
): AncestorCheckResult {
  // checkAncestors called
  const missingLevels: string[] = [];
  let currentCoordId = coordId;
  let hasAllAncestors = true;
  
  // Check if this is a root item
  const coords = CoordSystem.parseId(coordId);
  if (coords.path.length === 0) {
    return { hasAllAncestors: true, missingLevels: [] };
  }
  
  while (true) {
    const parentCoordId = CoordSystem.getParentCoordFromId(currentCoordId);
    if (!parentCoordId) break; // Reached root
    
    // Check if parent exists
    const hasParent = Array.isArray(existingItems)
      ? existingItems.some(item => item.coordinates === parentCoordId)
      : !!existingItems[parentCoordId];
      
    if (!hasParent) {
      hasAllAncestors = false;
      missingLevels.push(parentCoordId);
    }
    currentCoordId = parentCoordId;
  }
  
  return { hasAllAncestors, missingLevels };
}

/**
 * Load ancestors for a given item
 */
export async function loadAncestorsForItem(
  itemDbId: number,
  serverService: ServerService,
  dispatch: Dispatch<CacheAction>,
  _source = "unknown"
): Promise<void> {
  // loadAncestorsForItem called
  try {
    const ancestors = await serverService.getAncestors(itemDbId);
    
    if (ancestors.length > 0) {
      // Convert to TileData format
      const ancestorItems: Record<string, TileData> = {};
      
      ancestors.forEach(ancestor => {
        const coordId = ancestor.coordinates;
        const ancestorCoords = CoordSystem.parseId(coordId);
        
        ancestorItems[coordId] = {
          data: {
            title: ancestor.title,
            content: ancestor.content,
        preview: ancestor.preview,
            link: ancestor.link,
            color: getColor(ancestorCoords),
          },
          metadata: {
            coordId,
            dbId: ancestor.id,
            depth: ancestorCoords.path.length,
            parentId: ancestor.parentId ? ancestor.parentId.toString() : undefined,
            coordinates: ancestorCoords,
            ownerId: ancestor.ownerId,
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
      });
      
      // Dispatch ancestors to cache
      dispatch(cacheActions.updateItems(ancestorItems));
      // Loaded ancestors
    }
  } catch (_error) {
    console.warn('Failed to load ancestors:', _error);
  }
}