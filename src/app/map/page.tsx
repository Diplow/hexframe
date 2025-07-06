"use client";

import { use, useEffect, useState, useMemo } from "react";
import { MapCacheProvider } from "./Cache/map-cache";
import { useMapIdResolution } from "./_hooks/use-map-id-resolution";
import { MapLoadingSkeleton } from "./Canvas/LifeCycle/loading-skeleton";
import { ChatCacheProvider } from "./Chat/_cache/ChatCacheProvider";
import { MapPageContent } from "./_components/MapPageContent";
import { EventBus } from "./Services/event-bus";

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
  const eventBus = useMemo(() => new EventBus(), []);
  
  // Prevent SSR/hydration issues
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Handle missing center
  const isOffline = params.offline === 'true';
  
  // Resolve mapItemId to coordinates BEFORE passing to cache
  // This ensures the cache only ever sees proper coordinates
  const { 
    centerCoordinate, 
    userId, 
    groupId, 
    rootItemId, 
    isLoading: isResolving, 
    error: resolutionError 
  } = useMapIdResolution(params.center ?? '');

  // Always show loading state during SSR and initial mount to prevent flashes
  if (!mounted || !params.center) {
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
  
  // Show loading while resolving mapItemId
  if (isResolving) {
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
  return (
    <div className="relative flex h-full w-full">
      <MapCacheProvider
        initialItems={{}} // Start with empty items - cache will load from server
        initialCenter={centerCoordinate} // Now always a proper coordinate!
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
              type: 'message',
              payload: {
                content: 'Welcome to **HexFrame**! Navigate the map by clicking on tiles, or use the chat to ask questions.',
                actor: 'system',
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