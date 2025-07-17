import { type ReactNode } from "react";
import { MapErrorBoundary } from "../Canvas/LifeCycle/error-boundary";
import { MapLoadingSkeleton } from "../Canvas/LifeCycle/loading-skeleton";
import type { URLInfo } from "../types/url-info";

interface MapStateHandlerProps {
  urlInfo: URLInfo | null;
  initError: Error | null;
  isLoading: boolean;
  dataError: Error | null;
  hasData: boolean;
  children: ReactNode;
}

export function MapStateHandler({
  urlInfo,
  initError,
  isLoading,
  dataError,
  hasData,
  children,
}: MapStateHandlerProps) {
  // Handle initialization error or missing center
  if (initError || (urlInfo && !urlInfo.rootItemId)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">No map specified</h1>
          <p className="mt-2 text-neutral-600">
            Please provide a map center ID in the URL
          </p>
        </div>
      </div>
    );
  }

  // Handle loading states
  if (!urlInfo) {
    return <MapLoadingSkeleton message="Initializing..." state="initializing" />;
  }

  if (isLoading) {
    return <MapLoadingSkeleton message="Loading map data..." state="loading" />;
  }

  // Handle data fetch errors
  if (dataError || !hasData) {
    return (
      <MapErrorBoundary
        error={dataError ?? new Error("Failed to load map data")}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // All good, render children
  return <>{children}</>;
}