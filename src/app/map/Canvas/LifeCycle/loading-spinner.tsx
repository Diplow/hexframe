"use client";

import { cn } from "~/lib/utils";

interface MapLoadingSpinnerProps {
  className?: string;
  message?: string;
  state?: "detecting" | "loading" | "initializing";
}

export function MapLoadingSpinner({
  className,
  message = "Loading map...",
  state = "loading",
}: MapLoadingSpinnerProps) {
  // Scale 2 tile dimensions: baseHexSize * 2 * Math.pow(3, scale - 1)
  // With baseHexSize = 50: 50 * 2 * Math.pow(3, 1) = 300px
  const spinnerSize = 300;

  // Adjust spinner appearance based on state
  const getSpinnerClasses = () => {
    const baseClasses = "rounded-full border-4 motion-reduce:animate-none";
    switch (state) {
      case "detecting":
        return `${baseClasses} animate-pulse border-blue-300 border-t-blue-600 dark:border-blue-600 dark:border-t-blue-300`;
      case "initializing":
        return `${baseClasses} animate-spin border-green-300 border-t-green-600 dark:border-green-600 dark:border-t-green-300`;
      case "loading":
      default:
        return `${baseClasses} animate-spin border-neutral-300 border-t-neutral-600 dark:border-neutral-600 dark:border-t-neutral-300`;
    }
  };

  return (
    <div className={cn("relative flex h-full w-full flex-col", className)}>
      <div className="grid flex-grow place-items-center overflow-hidden p-4" style={{ transform: 'translateX(20%)' }}>
        {/* Accessible loading indicator */}
        <div className="relative" role="status">
          <div
            className={getSpinnerClasses()}
            style={{
              width: `${spinnerSize}px`,
              height: `${spinnerSize}px`
            }}
          />

          {/* Message overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
              {message}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}