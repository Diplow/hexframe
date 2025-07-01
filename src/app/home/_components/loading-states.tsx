import React from "react";

interface LoadingStateProps {
  message?: string;
}

/**
 * Displays loading states with appropriate messages
 */
export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-4">
      <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{message}</div>
    </div>
  );
}

export function CreatingWorkspaceState() {
  return <LoadingState message="Creating your map..." />;
}

export function RedirectingState() {
  return <LoadingState message="Redirecting to your map..." />;
}

export function FetchingMapState() {
  return <LoadingState message="Loading your map..." />;
}
