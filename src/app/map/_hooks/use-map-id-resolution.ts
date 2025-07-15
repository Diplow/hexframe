import { useEffect, useState } from "react";
import { api } from "~/commons/trpc/react";

interface ResolvedMapInfo {
  centerCoordinate: string;
  userId: number;
  groupId: number;
  rootItemId: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Resolves a map identifier (either mapItemId or coordinate) to actual coordinates
 * This ensures the cache only ever sees proper coordinates, not mapItemIds
 */
export function useMapIdResolution(centerParam: string): ResolvedMapInfo {
  // useMapIdResolution called
  const [resolvedInfo, setResolvedInfo] = useState<ResolvedMapInfo>({
    centerCoordinate: "",
    userId: 0,
    groupId: 0,
    rootItemId: 0,
    isLoading: true,
    error: null,
  });

  // Check if this is already a coordinate format
  const isCoordinate = centerParam.includes(",");
  const hasValidParam = !!centerParam;
  
  // Use tRPC to fetch root item if it's a mapItemId
  // Note: hooks must always be called in the same order, so we can't return early
  const { data: rootItem, isLoading, error } = api.map.getRootItemById.useQuery(
    { mapItemId: parseInt(centerParam || "0") },
    { 
      enabled: hasValidParam && !isCoordinate && /^\d+$/.test(centerParam),
      staleTime: Infinity, // Cache forever since root items don't change
    }
  );

  useEffect(() => {
    // Effect running
    
    // Handle empty parameter case
    if (!hasValidParam) {
      setResolvedInfo({
        centerCoordinate: "",
        userId: 0,
        groupId: 0,
        rootItemId: 0,
        isLoading: false,
        error: null,
      });
      return;
    }
    
    if (isCoordinate) {
      // Already a coordinate, parse it
      const parts = centerParam.split(",");
      const userIdStr = parts[0];
      const rest = parts[1];
      const groupIdStr = rest ? rest.split(":")[0] : "0";
      
      // Parse with validation to prevent NaN
      const userId = parseInt(userIdStr ?? "0") || 0;
      const groupId = parseInt(groupIdStr ?? "0") || 0;
      const rootItemId = userId; // For coordinates, rootItemId is usually the userId
      
      const info = {
        centerCoordinate: centerParam,
        userId,
        groupId,
        rootItemId,
        isLoading: false,
        error: null,
      };
      // Resolved coordinate
      setResolvedInfo(info);
    } else if (rootItem) {
      // Resolved from mapItemId to actual item
      const coords = rootItem.coordinates.split(",");
      const userIdStr = coords[0];
      const rest = coords[1];
      const groupIdStr = rest ? rest.split(":")[0] : "0";
      
      // Parse with validation to prevent NaN
      const userId = parseInt(userIdStr ?? "0") || 0;
      const groupId = parseInt(groupIdStr ?? "0") || 0;
      const rootItemId = parseInt(centerParam) || 0;
      
      const info = {
        centerCoordinate: rootItem.coordinates,
        userId,
        groupId,
        rootItemId,
        isLoading: false,
        error: null,
      };
      // Resolved from rootItem
      setResolvedInfo(info);
    } else if (error) {
      // Error resolving
      setResolvedInfo(prev => ({
        ...prev,
        isLoading: false,
        error: new Error(error.message || "Failed to resolve map ID"),
      }));
    }
  }, [centerParam, isCoordinate, hasValidParam, rootItem, error]);

  const result = {
    ...resolvedInfo,
    isLoading: hasValidParam && !isCoordinate && isLoading,
  };
  
  // Returning result
  return result;
}