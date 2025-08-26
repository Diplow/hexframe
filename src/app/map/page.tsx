"use client";

import { MapResolverProvider } from './MapResolver/interface';
import { MapCacheProvider } from './Cache/interface';
import { EventBusProvider } from './Services/EventBus/interface';
import { eventBus } from './Services/EventBus/event-bus';
import { MapLoadingUI } from './_components/MapLoadingUI';
import { MapUI } from './_components/MapUI';
import { useMapPageSetup } from './_hooks/useMapPageSetup';

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