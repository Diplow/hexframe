"use client";

import { MapLoadingSpinner } from "~/app/map/Canvas";
import { ParentHierarchy } from "~/app/map/Hierarchy";

interface MapLoadingUIProps {
  message: string;
}

export function MapLoadingUI({ message }: MapLoadingUIProps) {
  return (
    <>
      {/* Canvas layer - extends full width, positioned behind chat panel */}
      <div className="absolute inset-0 pr-[130px] overflow-hidden" style={{ zIndex: 1 }}>
        <MapLoadingSpinner
          message={message}
          state="initializing"
        />
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
    </>
  );
}