"use client";

import { ChatPanel } from "~/app/map/Chat/ChatPanel";
import { MapLoadingSkeleton } from "~/app/map/Canvas";

interface MapLoadingUIProps {
  message: string;
}

export function MapLoadingUI({ message }: MapLoadingUIProps) {
  return (
    <div className="flex h-full w-full relative">
      <div className="flex w-full">
        <ChatPanel className="w-[40%] min-w-[40%] flex-shrink-0 border-r border-[color:var(--stroke-color-950)] overflow-hidden" />
        
        <div className="flex-1 pr-[130px]">
          <MapLoadingSkeleton 
            message={message} 
            state="initializing" 
          />
        </div>
      </div>
    </div>
  );
}