"use client";

import { MapResolverProvider } from '~/app/map/MapResolver';
import { MapCacheProvider } from '~/app/map/Cache';
import { EventBusProvider, EventBus } from './';
const eventBus = new EventBus();
import { MapLoadingUI } from '~/app/map/_components/MapLoadingUI';
import { MapUI } from '~/app/map/_components/MapUI';
import { useMapPageSetup } from '~/app/map/_hooks/useMapPageSetup';

interface MapPageProps {
  searchParams: Promise<{
    center?: string;
    scale?: string;
    expandedItems?: string;
    focus?: string;
  }>;
}

export default function MapPage({ searchParams }: MapPageProps) {
  return (
    <EventBusProvider eventBus={eventBus}>
      <MapResolverProvider>
        <MapPageWithProviders searchParams={searchParams} />
      </MapResolverProvider>
    </EventBusProvider>
  );
}

function MapPageWithProviders({ searchParams }: { 
  searchParams: Promise<{
    center?: string;
    scale?: string;
    expandedItems?: string;
    focus?: string;
  }>
}) {
  const setup = useMapPageSetup({ searchParams });
  
  return (
    <MapCacheProvider {...setup.cacheProviderProps}>
      {!setup.isReady ? (
        <MapLoadingUI message={setup.loadingMessage} />
      ) : (
        <MapUI centerParam={setup.centerParam} />
      )}
    </MapCacheProvider>
  );
}