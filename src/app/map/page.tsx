"use client";

// Force dynamic rendering - this page should not be statically generated
export const dynamic = 'force-dynamic';

import { MapResolverProvider } from '~/app/map/MapResolver';
import { MapCacheProvider } from '~/app/map/Cache';
import { EventBusProvider, eventBus } from '~/app/map/Services';
import { OperationsProvider } from '~/app/map/Services';
import { MapLoadingUI } from '~/app/map/_components/MapLoadingUI';
import { MapUI } from '~/app/map/_components/MapUI';
import { ChatPanel } from '~/app/map/Chat';
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
      <OperationsProvider>
        <div className="h-full w-full relative overflow-hidden">
          {/* Chat panel - persists across loading states */}
          <div className="absolute left-0 top-0 bottom-0 w-[40%] min-w-[40%]" style={{ zIndex: 10 }}>
            <ChatPanel className="h-full overflow-hidden" />
          </div>

          {/* Main content - switches between loading and ready states */}
          {!setup.isReady ? (
            <MapLoadingUI message={setup.loadingMessage} />
          ) : (
            <MapUI centerParam={setup.centerParam} />
          )}
        </div>
      </OperationsProvider>
    </MapCacheProvider>
  );
}