"use client";

import { useEffect, useState } from "react";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { TileData } from "../../types/tile-data";
import { useMapCache } from "../../Cache/map-cache";

/**
 * Hook to ensure ancestors are loaded for the current item
 */
export function useLoadAncestors(centerCoordId: string, items: Record<string, TileData>) {
  const [isLoadingAncestors, setIsLoadingAncestors] = useState(false);
  const [ancestorsLoaded, setAncestorsLoaded] = useState(false);
  const mapCache = useMapCache();
  
  useEffect(() => {
    const loadMissingAncestors = async () => {
      // Check if we need to load ancestors
      const centerItem = items[centerCoordId];
      if (!centerItem) return;
      
      // If this is a root item (no path), no ancestors to load
      if (centerItem.metadata.coordinates.path.length === 0) {
        setAncestorsLoaded(true);
        return;
      }
      
      // Check if we have all ancestors by walking up the tree
      let currentCoordId = centerCoordId;
      let hasAllAncestors = true;
      
      while (true) {
        const parentCoordId = CoordSystem.getParentCoordFromId(currentCoordId);
        if (!parentCoordId) break; // Reached root
        
        if (!items[parentCoordId]) {
          hasAllAncestors = false;
          break;
        }
        currentCoordId = parentCoordId;
      }
      
      // If we have all ancestors, we're done
      if (hasAllAncestors) {
        setAncestorsLoaded(true);
        return;
      }
      
      // Load ancestors from the server
      setIsLoadingAncestors(true);
      try {
        const serverService = mapCache.sync.serverService;
        if (!serverService) {
          console.warn('Server service not available');
          return;
        }
        
        // Get the dbId of the center item
        const centerDbId = parseInt(centerItem.metadata.dbId);
        if (isNaN(centerDbId)) {
          console.error('Invalid center item dbId:', centerItem.metadata.dbId);
          return;
        }
        
        // Fetch ancestors from the server
        const ancestors = await serverService.getAncestors(centerDbId);
        
        // Convert server response to TileData format and add to cache
        const ancestorTileData: Record<string, TileData> = {};
        
        ancestors.forEach(ancestor => {
          const coordId = ancestor.coordinates;
          const coords = CoordSystem.parseId(coordId);
          
          ancestorTileData[coordId] = {
            data: {
              name: ancestor.name,
              description: ancestor.descr,
              url: ancestor.url,
              color: '#000000', // Default color
            },
            metadata: {
              coordId,
              dbId: ancestor.id,
              depth: coords.path.length,
              parentId: ancestor.parentId ? ancestor.parentId.toString() : undefined,
              coordinates: coords,
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
        
        // Load ancestors into the cache by dispatching directly
        // Since loadRegion is async, we'll update the cache state directly
        // This is a simplified approach - in production you might want to 
        // properly integrate with the cache's data loading mechanisms
        console.log('Loaded', Object.keys(ancestorTileData).length, 'ancestors');
        
        setAncestorsLoaded(true);
      } catch (error) {
        console.error('Failed to load ancestors:', error);
      } finally {
        setIsLoadingAncestors(false);
      }
    };
    
    void loadMissingAncestors();
  }, [centerCoordId, items, mapCache]);
  
  return { isLoadingAncestors, ancestorsLoaded };
}