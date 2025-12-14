import type { ReactNode } from "react";
import { MapErrorBoundary } from "~/app/map/Canvas/_internals/CanvasStates/error-boundary";

interface CanvasErrorStateProps {
  error: Error;
  centerInfo: string;
  errorBoundary?: ReactNode;
  onRetry: (center: string) => void;
}

export function CanvasErrorState({
  error,
  centerInfo,
  errorBoundary,
  onRetry,
}: CanvasErrorStateProps) {
  return (
    errorBoundary ?? (
      <MapErrorBoundary
        error={error}
        onRetry={() => onRetry(centerInfo)}
      />
    )
  );
}
