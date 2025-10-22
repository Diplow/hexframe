import type { ReactNode } from "react";
import { MapLoadingSpinner } from "~/app/map/Canvas/LifeCycle/loading-spinner";

interface CanvasLoadingStateProps {
  fallback?: ReactNode;
}

export function CanvasLoadingState({ fallback }: CanvasLoadingStateProps) {
  return fallback ?? <MapLoadingSpinner />;
}
