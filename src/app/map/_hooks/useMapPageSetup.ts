"use client";

import { use, useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { api } from "~/commons/trpc/react";
import { loadPreFetchedData, clearPreFetchedData, type PreFetchedMapData } from '~/app/map/Services';
import { EventBus } from '~/app/map';
const eventBus = new EventBus();
import type { TileData } from '~/app/map/types/tile-data';
import { useMapResolver } from '~/app/map/MapResolver';

interface MapPageSetupParams {
  center?: string;
  scale?: string;
  expandedItems?: string;
  focus?: string;
}

interface UseMapPageSetupProps {
  searchParams: Promise<MapPageSetupParams>;
}

interface MapPageSetupResult {
  isReady: boolean;
  loadingMessage: string;
  centerParam?: string;
  cacheProviderProps: {
    initialItems: Record<string, TileData>;
    initialCenter: string | null;
    initialExpandedItems: string[];
    cacheConfig: {
      maxAge: number;
      backgroundRefreshInterval: number;
      enableOptimisticUpdates: boolean;
      maxDepth: number;
    };
    eventBus: typeof eventBus;
  };
}

const CACHE_CONFIG = {
  maxAge: 300000, // 5 minutes
  backgroundRefreshInterval: 30000, // 30 seconds
  enableOptimisticUpdates: true,
  maxDepth: 3, // Hierarchical loading depth
};

export function useMapPageSetup({ searchParams }: UseMapPageSetupProps): MapPageSetupResult {
  // Parse search params
  const params = use(searchParams);
  
  // Resolve center parameter to coordinate
  const { 
    centerCoordinate, 
    isLoading: isCenterResolving, 
    error: centerError 
  } = useMapResolver(params.center ?? "");
  
  // State management
  const [mounted, setMounted] = useState(false);
  const [preFetchedData, setPreFetchedData] = useState<PreFetchedMapData | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  
  // Update loading message based on center resolution
  useEffect(() => {
    if (params.center && isCenterResolving) {
      setLoadingMessage("Resolving map location...");
    } else if (params.center && centerError) {
      setLoadingMessage("Failed to resolve map location");
    } else if (params.center && centerCoordinate) {
      setLoadingMessage("Map location resolved");
    }
  }, [params.center, isCenterResolving, centerError, centerCoordinate]);

  // User map resolution for when no center is provided
  const [isLoadingUserMap, setIsLoadingUserMap] = useState(false);
  const { data: userMapResponse, isLoading: isUserMapLoading } = api.map.getUserMap.useQuery(
    undefined,
    {
      enabled: mounted && !params.center,
      refetchOnWindowFocus: false,
    }
  );
  
  // Handle mounting and pre-fetch data loading
  useEffect(() => {
    setMounted(true);
    
    // Check for pre-fetched map data
    const preFetched = loadPreFetchedData();
    if (preFetched) {
      setPreFetchedData(preFetched);
      clearPreFetchedData();
    }
  }, []);

  // Handle user map resolution
  useEffect(() => {
    if (!mounted || params.center) return;
    
    setIsLoadingUserMap(isUserMapLoading);
    
    if (isUserMapLoading) {
      setLoadingMessage("Loading your map...");
    } else if (!isUserMapLoading && userMapResponse?.success && userMapResponse.map?.id) {
      // Redirect to user's default map
      const searchParams = new URLSearchParams();
      searchParams.set('center', userMapResponse.map.id.toString());
      
      // Preserve other params
      if (params.scale) searchParams.set('scale', params.scale);
      if (params.expandedItems) searchParams.set('expandedItems', params.expandedItems);
      if (params.focus) searchParams.set('focus', params.focus);
      
      redirect(`/map?${searchParams.toString()}`);
    }
  }, [mounted, params, userMapResponse, isUserMapLoading]);

  // Determine readiness - we're ready if we have resolved center or finished user resolution
  const isReady = mounted && 
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    ((params.center && !isCenterResolving && !centerError && !!centerCoordinate) || 
     (!params.center && !isLoadingUserMap));


  // Prepare cache provider props
  const cacheProviderProps = {
    initialItems: preFetchedData?.initialItems ?? {},
    initialCenter: centerCoordinate || null, // Use resolved coordinate as initial center
    initialExpandedItems: params.expandedItems ? params.expandedItems.split(',') : [],
    cacheConfig: CACHE_CONFIG,
    eventBus,
  };
  

  return {
    isReady,
    loadingMessage,
    centerParam: params.center,
    cacheProviderProps,
  };
}