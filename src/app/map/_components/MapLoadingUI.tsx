"use client";

import { ChatPanel } from "~/app/map/Chat";
import { MapLoadingSkeleton } from "~/app/map/Canvas";

interface MapLoadingUIProps {
  message: string;
}

export function MapLoadingUI({ message }: MapLoadingUIProps) {
  return (
    <div className="h-full w-full relative">
      {/* Canvas layer - extends full width, positioned behind chat panel */}
      <div className="absolute inset-0 pr-[130px]" style={{ zIndex: 1 }}>
        <MapLoadingSkeleton
          message={message}
          state="initializing"
        />
      </div>

      {/* Chat panel - positioned over the canvas */}
      <div className="absolute left-0 top-0 bottom-0 w-[40%] min-w-[40%]" style={{ zIndex: 10 }}>
        <ChatPanel className="h-full overflow-hidden" />
      </div>
    </div>
  );
}