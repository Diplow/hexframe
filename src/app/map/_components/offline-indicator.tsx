"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

interface OfflineIndicatorProps {
  isOffline: boolean;
}

export function OfflineIndicator({ isOffline }: OfflineIndicatorProps) {
  const [showIndicator, setShowIndicator] = useState(isOffline);
  
  useEffect(() => {
    setShowIndicator(isOffline);
  }, [isOffline]);

  if (!showIndicator) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 rounded-lg bg-secondary/10 px-4 py-2 shadow-lg border border-secondary/20">
        <WifiOff className="h-5 w-5 text-secondary" />
        <div className="text-sm">
          <p className="font-medium text-secondary-dark">Offline Mode</p>
          <p className="text-secondary">Using cached data</p>
        </div>
      </div>
    </div>
  );
}