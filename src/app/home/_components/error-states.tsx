import React from "react";
import { ErrorTile } from "~/app/map/Canvas/interface";

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  showTimestamp?: boolean;
}

/**
 * Displays error states with retry functionality
 */
export function ErrorState({ 
  title, 
  message, 
  onRetry, 
  showTimestamp = false 
}: ErrorStateProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-600 p-4">
      <ErrorTile 
        title={title}
        message={message}
        onRetry={onRetry}
        showTimestamp={showTimestamp}
      />
    </div>
  );
}

export function MapCreationError({ message }: { message: string }) {
  return (
    <ErrorState 
      title="Workspace Creation Failed"
      message={message}
      showTimestamp
    />
  );
}

export function MapFetchError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <ErrorState 
      title="Map Error"
      message={`${message}. Please try again later or contact support if the problem persists.`}
      onRetry={onRetry}
    />
  );
}