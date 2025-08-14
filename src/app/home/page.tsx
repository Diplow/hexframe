"use client";

import React from "react";
import { useUnifiedAuth } from "~/contexts/UnifiedAuthContext";
import { useUserMapFlow } from "./_hooks/use-user-map-flow";
import {
  LoadingState,
  CreatingWorkspaceState,
  RedirectingState,
  FetchingMapState,
} from "./_components/loading-states";
import { MapCreationError, MapFetchError } from "./_components/error-states";
import { WelcomeScreen } from "~/app/_components/welcome-screen";

/**
 * Home page that orchestrates user authentication and map access
 * Delegates all business logic to useUserMapFlow hook
 */
export default function HomePage() {
  const { user, isLoading: isAuthLoading } = useUnifiedAuth();
  const { state, error, retry } = useUserMapFlow({ user, isAuthLoading });

  // Render appropriate UI based on current state
  switch (state) {
    case "loading":
      return <LoadingState />;

    case "unauthenticated":
      return <WelcomeScreen />;

    case "fetching_map":
      return <FetchingMapState />;

    case "creating_map":
      return <CreatingWorkspaceState />;

    case "redirecting":
      return <RedirectingState />;

    case "error":
      if (error?.type === "map_creation") {
        return <MapCreationError message={error.message} />;
      }
      return (
        <MapFetchError message={error?.message ?? "Unknown error"} onRetry={retry} />
      );

    default:
      // This should never happen with proper state management
      return <LoadingState />;
  }
}
