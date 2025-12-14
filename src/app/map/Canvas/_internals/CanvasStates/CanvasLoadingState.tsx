import type { ReactNode } from "react";
import { MapLoadingSpinner } from "~/app/map/Canvas/_internals/CanvasStates/loading-spinner";

interface CanvasLoadingStateProps {
  fallback?: ReactNode;
}

export function CanvasLoadingState({ fallback }: CanvasLoadingStateProps) {
  return fallback ?? <MapLoadingSpinner />;
}
