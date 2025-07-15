"use client";

import { use, useEffect, useState } from "react";
import { MapCacheProvider } from "./Cache/map-cache";
import { useMapIdResolution } from "./_hooks/use-map-id-resolution";
import { ChatCacheProvider } from "./Chat/Cache/ChatCacheProvider";
import { MapPageContent } from "./_components/MapPageContent";
import { eventBus } from "./Services/event-bus";
import { loadPreFetchedData, clearPreFetchedData } from "./Cache/Services/pre-fetch-service";
import { api } from "~/commons/trpc/react";
import { useRouter } from "next/navigation";

interface MapPageProps {
  searchParams: Promise<{
    center?: string;
    scale?: string;
    expandedItems?: string;
    focus?: string;
    offline?: string;
  }>;
}

const CACHE_CONFIG = {
  maxAge: 300000, // 5 minutes
  backgroundRefreshInterval: 30000, // 30 seconds
  enableOptimisticUpdates: true,
  maxDepth: 3, // Hierarchical loading depth
};

// localStorage sync is always enabled. To test:
// 1. Load a map while online
// 2. Data is automatically saved to localStorage
// 3. Add ?offline=true to URL or disconnect network
// 4. Refresh - data loads from localStorage

export default function MapPage({ searchParams }: MapPageProps) {
  // Use React 18's use() to unwrap the promise synchronously
  const params = use(searchParams);
  
  // Create a single EventBus instance for the entire map page
  // Use the singleton eventBus instance to ensure debug logs work
  
  // Prevent SSR/hydration issues
  const [mounted, setMounted] = useState(false);
  
  // Check for pre-fetched data
  const [preFetchedData, setPreFetchedData] = useState<ReturnType<typeof loadPreFetchedData>>(null);
  
  const router = useRouter();
  
  // Handle missing center parameter by fetching user's map
  const { data: userMapData, isLoading: isLoadingUserMap } = api.map.user.getUserMap.useQuery(
    undefined,
    { 
      enabled: mounted && !params.center,
      staleTime: 60000, // Cache for 1 minute
    }
  );
  
  useEffect(() => {
    console.log('[MapPage] 🏗️ Map page mounting...');
    setMounted(true);
    
    // Check for pre-fetched map data
    const preFetched = loadPreFetchedData();
    if (preFetched) {
      console.log('[MapPage] ✅ Found pre-fetched data, using for initial cache');
      setPreFetchedData(preFetched);
      // Clear pre-fetched data after using it to avoid stale data issues
      clearPreFetchedData();
    } else {
      console.log('[MapPage] ❌ No pre-fetched data found, will use empty cache');
    }
  }, []);
  
  // Handle redirect when user map is loaded
  useEffect(() => {
    if (!params.center && userMapData) {
      if (userMapData.success && userMapData.map?.id) {
        console.log('[MapPage] Redirecting to user map:', userMapData.map.id);
        router.replace(`/map?center=${userMapData.map.id}`);
      } else {
        // User doesn't have a map yet, redirect to a default
        console.log('[MapPage] User has no map, redirecting to default');
        // For now, redirect to the public Hexframe map (ID 1)
        router.replace(`/map?center=1`);
      }
    }
  }, [params.center, userMapData, router]);
  
  // Handle missing center
  const isOffline = params.offline === 'true';
  
  // Only resolve map ID if we have a center parameter
  // If no center, we'll wait for the user map redirect
  const shouldResolve = !!params.center && mounted;
  
  // Resolve mapItemId to coordinates BEFORE passing to cache
  // This ensures the cache only ever sees proper coordinates
  const { 
    centerCoordinate, 
    userId, 
    groupId, 
    rootItemId, 
    isLoading: isResolving, 
    error: resolutionError 
  } = useMapIdResolution(shouldResolve ? params.center! : '');

  // Always show loading state during SSR and initial mount to prevent flashes
  // Also show loading when we're fetching the user's map for redirect
  if (!mounted || (!params.center && isLoadingUserMap)) {
    console.log('[MapPage] Showing loading state:', { 
      mounted, 
      hasCenter: !!params.center, 
      isLoadingUserMap 
    });
    return (
      <div className="relative flex h-full w-full">
        <MapCacheProvider
          initialItems={{}}
          initialCenter={null}
          initialExpandedItems={[]}
          cacheConfig={CACHE_CONFIG}
          offlineMode={isOffline}
          eventBus={eventBus}
          mapContext={{
            rootItemId: 0,
            userId: 0,
            groupId: 0,
          }}
          testingOverrides={{
            disableSync: true,
          }}
        >
          <ChatCacheProvider eventBus={eventBus}>
            <MapPageContent
                centerCoordinate={"0,0"}
                params={params}
                rootItemId={0}
                userId={0}
                groupId={0}
                isOffline={isOffline}
                isLoading={true}
                loadingError={null}
            />
          </ChatCacheProvider>
        </MapCacheProvider>
      </div>
    );
  }
  
  // Show loading while resolving mapItemId (only if we should resolve)
  if (shouldResolve && isResolving) {
    // Show the layout structure with loading skeleton in canvas area
    return (
      <div className="relative flex h-full w-full">
        <MapCacheProvider
          initialItems={{}}
          initialCenter={null} // Don't set a center during loading to prevent fetch attempts
          initialExpandedItems={[]}
          cacheConfig={CACHE_CONFIG}
          offlineMode={isOffline}
          eventBus={eventBus}
          mapContext={{
            rootItemId: 0,
            userId: 0,
            groupId: 0,
          }}
          testingOverrides={{
            disableSync: true,
          }}
        >
          <ChatCacheProvider eventBus={eventBus}>
            <MapPageContent
                centerCoordinate={"0,0"}
                params={params}
                rootItemId={0}
                userId={0}
                groupId={0}
                isOffline={isOffline}
                isLoading={true}
                loadingError={null}
            />
          </ChatCacheProvider>
        </MapCacheProvider>
      </div>
    );
  }
  
  // Show error only if resolution actually failed (not just empty coordinate during loading)
  if (resolutionError) {
    return (
      <div className="relative flex h-full w-full">
        <MapCacheProvider
          initialItems={{}}
          initialCenter={null} // Don't set a center during error state to prevent fetch attempts
          initialExpandedItems={[]}
          cacheConfig={CACHE_CONFIG}
          offlineMode={isOffline}
          eventBus={eventBus}
          mapContext={{
            rootItemId: 0,
            userId: 0,
            groupId: 0,
          }}
          testingOverrides={{
            disableSync: true,
          }}
        >
          <ChatCacheProvider eventBus={eventBus}>
            <MapPageContent
                centerCoordinate={"0,0"}
                params={params}
                rootItemId={0}
                userId={0}
                groupId={0}
                isOffline={isOffline}
                isLoading={false}
                loadingError={resolutionError || new Error("Unable to load the requested map")}
            />
          </ChatCacheProvider>
        </MapCacheProvider>
      </div>
    );
  }

  // If we're done loading but still don't have a coordinate, show error in canvas
  if (!centerCoordinate) {
    return (
      <div className="relative flex h-full w-full">
        <MapCacheProvider
          initialItems={{}}
          initialCenter={null}
          initialExpandedItems={[]}
          cacheConfig={CACHE_CONFIG}
          offlineMode={isOffline}
          eventBus={eventBus}
          mapContext={{
            rootItemId: 0,
            userId: 0,
            groupId: 0,
          }}
          testingOverrides={{
            disableSync: true,
          }}
        >
          <ChatCacheProvider eventBus={eventBus}>
            <MapPageContent
                centerCoordinate={"0,0"}
                params={params}
                rootItemId={0}
                userId={0}
                groupId={0}
                isOffline={isOffline}
                isLoading={false}
                loadingError={new Error("Unable to resolve map coordinates")}
            />
          </ChatCacheProvider>
        </MapCacheProvider>
      </div>
    );
  }

  // Success case - we have all the data
  // Use pre-fetched data if available, otherwise start with empty cache
  const initialItems = preFetchedData?.initialItems ?? {};
  const effectiveCenter = preFetchedData?.centerCoordinate ?? centerCoordinate;
  
  console.log('[MapPage] 🎯 Initializing cache with:', {
    hasPreFetchedData: !!preFetchedData,
    itemCount: Object.keys(initialItems).length,
    center: effectiveCenter,
    urlCenter: centerCoordinate,
    preFetchedCenter: preFetchedData?.centerCoordinate,
    sampleTileNames: Object.values(initialItems).slice(0, 3).map(tile => tile.data?.name),
  });
  
  return (
    <div className="relative flex h-full w-full">
      <MapCacheProvider
        initialItems={initialItems} // Use pre-fetched data or empty cache
        initialCenter={effectiveCenter} // Use pre-fetched center or resolved coordinate
        initialExpandedItems={params.expandedItems?.split(",") ?? []}
        cacheConfig={CACHE_CONFIG}
        offlineMode={isOffline}
        eventBus={eventBus}
        mapContext={{
          rootItemId,
          userId,
          groupId,
        }}
        testingOverrides={{
          disableSync: true, // Disable sync until basic cache is working
        }}
      >
        <ChatCacheProvider 
          eventBus={eventBus}
          initialEvents={[
            {
              type: 'system_message',
              payload: {
                message: 'Welcome to **HexFrame**! Navigate the map by clicking on tiles, or use the chat to ask questions.',
                level: 'info',
              },
              id: 'welcome-message',
              timestamp: new Date(),
              actor: 'system',
            }
          ]}
        >
          <MapPageContent
            centerCoordinate={centerCoordinate}
            params={params}
            rootItemId={rootItemId}
            userId={userId}
            groupId={groupId}
            isOffline={isOffline}
          />
        </ChatCacheProvider>
      </MapCacheProvider>
    </div>
  );
}