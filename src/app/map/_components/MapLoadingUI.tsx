"use client";

import { ChatPanel } from "~/app/map/Chat";
import { MapLoadingSpinner } from "~/app/map/Canvas";
import { ParentHierarchy } from "~/app/map/Hierarchy";

interface MapLoadingUIProps {
  message: string;
}

export function MapLoadingUI({ message }: MapLoadingUIProps) {
  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Canvas layer - extends full width, positioned behind chat panel */}
      <div className="absolute inset-0 pr-[130px] overflow-hidden" style={{ zIndex: 1 }}>
        <MapLoadingSpinner
          message={message}
          state="initializing"
        />
      </div>

      {/* Chat panel - positioned over the canvas */}
      <div className="absolute left-0 top-0 bottom-0 w-[40%] min-w-[40%]" style={{ zIndex: 10 }}>
        <ChatPanel className="h-full overflow-hidden" />
      </div>

      {/* Parent hierarchy - positioned over everything on the right */}
      <div className="absolute right-0 top-0 bottom-0 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border-l border-[color:var(--stroke-color-950)]" style={{ zIndex: 10 }}>
        <ParentHierarchy
          centerCoordId=""
          items={{}}
          urlInfo={{
            pathname: `/map`,
            searchParamsString: "",
            rootItemId: "",
            scale: undefined,
            expandedItems: undefined,
            focus: undefined,
          }}
        />
      </div>
    </div>
  );
}