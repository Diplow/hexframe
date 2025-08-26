"use client";

import { useEffect, useRef } from "react";
import { useMapCache } from '../Cache/interface';
import { useMapResolver } from '../MapResolver/interface';

interface MapCacheUpdaterProps {
  centerParam?: string;
}

export function MapCacheUpdater({ centerParam }: MapCacheUpdaterProps) {
  // Only resolve if we have a center param
  const { 
    centerCoordinate, 
    isLoading: isResolving, 
    error: resolutionError 
  } = useMapResolver(centerParam ?? "");
  
  // Get cache operations
  const { updateCenter, center } = useMapCache();
  
  // Track the last center coordinate we set to avoid fighting with navigation
  const lastSetCenterRef = useRef<string | null>(null);
  
  // Update cache center when resolution completes
  useEffect(() => {
    console.log('[MapCacheUpdater] Effect triggered:', {
      centerParam,
      isResolving,
      resolutionError: !!resolutionError,
      centerCoordinate,
      center,
      lastSetCenter: lastSetCenterRef.current,
      centersDifferent: center !== centerCoordinate,
      willUpdate: centerParam && !isResolving && !resolutionError && centerCoordinate && center !== centerCoordinate
    });
    
    // Only update the center if:
    // 1. We have valid resolution data
    // 2. The center is different from what was resolved
    // 3. We haven't already set this center (avoid fighting with navigation)
    if (centerParam && !isResolving && !resolutionError && centerCoordinate && 
        center !== centerCoordinate && lastSetCenterRef.current !== centerCoordinate) {
      console.log('[MapCacheUpdater] UPDATING CENTER:', { from: center, to: centerCoordinate });
      lastSetCenterRef.current = centerCoordinate;
      updateCenter(centerCoordinate);
    }
  }, [centerParam, isResolving, resolutionError, centerCoordinate, center, updateCenter]);
  
  // This component only handles side effects
  return null;
}