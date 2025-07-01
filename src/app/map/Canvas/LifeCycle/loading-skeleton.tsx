"use client";

import { useState, useEffect } from "react";
import { cn } from "~/lib/utils";
import { StaticFrame } from "~/app/static/map/Canvas/frame";
import type { TileData } from "../../types/tile-data";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { URLInfo } from "../../types/url-info";

interface MapLoadingSkeletonProps {
  className?: string;
  message?: string;
  blinkingFrequency?: number;
  state?: "detecting" | "loading" | "initializing";
}

export const DEFAULT_BLINKING_FREQUENCY = 400;

// Create mock items for the loading skeleton
const createMockItem = (
  coordId: string,
  name: string,
  color: string,
  depth = 0,
  parentId?: string,
): TileData => ({
  metadata: {
    dbId: `mock-${coordId.replace(",", "-")}`,
    coordId,
    parentId,
    coordinates: CoordSystem.parseId(coordId),
    depth,
    ownerId: "test-owner",
  },
  data: {
    name,
    description: "",
    url: "",
    color: color,
  },
  state: {
    isDragged: false,
    isHovered: false,
    isSelected: false,
    isExpanded: false,
    isDragOver: false,
    isHovering: false,
  },
});

export function MapLoadingSkeleton({
  className,
  message = "Loading map...",
  blinkingFrequency = DEFAULT_BLINKING_FREQUENCY,
  state = "loading",
}: MapLoadingSkeletonProps) {
  const [colorPattern, setColorPattern] = useState(true);

  // Adjust blinking frequency based on state
  const effectiveFrequency = state === "detecting" ? 300 : blinkingFrequency;

  // Mock center coordinate
  const centerCoord = "0,0";

  // Create child coordinates
  const childCoords = CoordSystem.getChildCoordsFromId(centerCoord);

  // Create mock URL info
  const mockUrlInfo: URLInfo = {
    pathname: "/map/loading",
    searchParamsString: "",
    rootItemId: "loading",
  };

  // Animate between color patterns
  useEffect(() => {
    const interval = setInterval(() => {
      setColorPattern((prev) => !prev);
    }, effectiveFrequency);

    return () => clearInterval(interval);
  }, [effectiveFrequency]);

  // Create mock items with alternating colors based on pattern
  const getChildColor = (index: number): string => {
    const isEven = index % 2 === 0;
    if (colorPattern) {
      return isEven ? "zinc-200" : "zinc-300";
    } else {
      return isEven ? "zinc-300" : "zinc-200";
    }
  };

  const mockMapItems: Record<string, TileData> = {
    [centerCoord]: createMockItem(centerCoord, message, "zinc-500", 0),
    ...childCoords.reduce(
      (acc, coordId, index) => {
        acc[coordId] = createMockItem(
          coordId,
          "",
          getChildColor(index),
          1,
          centerCoord,
        );
        return acc;
      },
      {} as Record<string, TileData>,
    ),
  };

  return (
    <div className={cn("relative flex h-full w-full flex-col", className)}>
      <div className="grid flex-grow place-items-center overflow-auto p-4">
        {/* Accessible loading indicator */}
        <div className="relative" role="status" aria-label={message}>
          <StaticFrame
            center={centerCoord}
            mapItems={mockMapItems}
            baseHexSize={50}
            expandedItemIds={[`mock-${centerCoord.replace(",", "-")}`]} // Use dbId for expansion
            scale={3}
            urlInfo={mockUrlInfo}
            interactive={false}
          />

          {/* Screen reader text */}
          <span className="sr-only">{message}</span>
        </div>
      </div>
    </div>
  );
}
