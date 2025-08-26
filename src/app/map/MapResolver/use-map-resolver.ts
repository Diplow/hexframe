import { useEffect, useMemo } from 'react';
import { useMapResolverContext } from './provider';
import { useResolverService } from './resolver-service';
import type { ResolvedMapInfo } from './types';

/**
 * Hook for resolving map identifiers to coordinates
 * 
 * @param centerParam - The map identifier (database ID or coordinate)
 * @returns ResolvedMapInfo with coordinate, metadata, and loading state
 */
export function useMapResolver(centerParam: string): ResolvedMapInfo {
  
  const { resolveMapId, dispatch, state } = useMapResolverContext();
  const resolverService = useResolverService();
  
  // Check if we need to resolve a database ID
  const isCoordinate = centerParam.includes(",");
  const hasValidParam = !!centerParam;
  const needsResolution = hasValidParam && !isCoordinate && /^\d+$/.test(centerParam);
  
  // Use TRPC query for database ID resolution
  const mapItemId = needsResolution ? parseInt(centerParam) : 0;
  const queryResult = resolverService.resolveFromDatabaseId(mapItemId);
  
  // Update cache only when query resolves - avoid excessive dispatches
  useEffect(() => {
    // Only proceed if we actually need resolution (database IDs)
    if (!needsResolution) return;
    
    
    // Skip if already cached
    if (state.resolvedCache.has(centerParam)) return;
    
    // Cache successful resolution results
    if (queryResult.data && !queryResult.isLoading && !queryResult.error) {
      const resolvedData: ResolvedMapInfo = {
        centerCoordinate: queryResult.data.coordinates || "",
        userId: parseInt(queryResult.data.ownerId) || 0,
        groupId: 0, // Not available in current API, defaulting to 0
        rootItemId: parseInt(queryResult.data.id) || 0,
        isLoading: false,
        error: null,
      };
      
      // Only update if coordinate is valid
      if (resolvedData.centerCoordinate) {
        dispatch({ type: 'SET_RESOLVED', payload: { centerParam, data: resolvedData } });
      }
      return;
    }
    
    // Cache error results
    if (queryResult.error && !queryResult.isLoading) {
      const errorData: ResolvedMapInfo = {
        centerCoordinate: "",
        userId: 0,
        groupId: 0,
        rootItemId: 0,
        isLoading: false,
        error: new Error(queryResult.error.message || 'Failed to resolve map ID'),
      };
      dispatch({ type: 'SET_RESOLVED', payload: { centerParam, data: errorData } });
    }
  }, [needsResolution, queryResult.data, queryResult.isLoading, queryResult.error, centerParam, dispatch, state.resolvedCache]);
  
  // Get the current resolved info - check cache first, then compute
  const cached = state.resolvedCache.get(centerParam);
  
  const resolvedInfo = useMemo(() => {
    if (cached) {
      // Return cached result - this should prevent re-renders once resolved
      return cached;
    }
    
    // If we need resolution and have a query in progress, return loading state
    if (needsResolution) {
      return {
        centerCoordinate: "",
        userId: 0,
        groupId: 0,
        rootItemId: 0,
        isLoading: queryResult.isLoading,
        error: queryResult.error ? new Error(queryResult.error.message || 'Failed to resolve map ID') : null,
      };
    }
    
    // Otherwise use the synchronous resolver (coordinates, empty params)
    return resolveMapId(centerParam);
  }, [
    cached, // This will only change when the cached value actually changes
    centerParam, 
    needsResolution, 
    queryResult.isLoading, 
    queryResult.error,
    resolveMapId
  ]);
  
  return resolvedInfo;
}