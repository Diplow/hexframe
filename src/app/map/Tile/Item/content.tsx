"use client";

import type { TileScale } from "~/app/static/map/Tile/Base/base";
import { getTextColorForDepth } from "~/app/map/types/theme-colors";
import { cn } from "~/lib/utils";

export interface DynamicTileContentProps {
  data: {
    title?: string;
    description?: string;
    url?: string;
  };
  scale: TileScale;
  tileId?: string;
  isHovered?: boolean;
  depth?: number; // Add depth prop for text color calculation
  isSelected?: boolean; // Add isSelected prop for chat selection state
}

const getTextClasses = (depth = 0) => `break-words ${getTextColorForDepth(depth)}`;

export const DynamicTileContent = ({ 
  data, 
  scale, 
  tileId: _tileId, 
  isHovered: _isHovered = false, 
  depth = 0,
  isSelected = false 
}: DynamicTileContentProps) => {
  if (!data) return null;
  
  const textClasses = getTextClasses(depth);
  const title = data.title ?? 'Untitled';
  
  // Scale-based styling
  const baseFontSize = scale === 1 ? "text-xs" : scale === 2 ? "text-md" : "text-lg";
  const fontWeight = scale === 1 ? "font-medium" : scale === 2 ? "font-medium" : "font-semibold";
  
  // Truncate title based on scale
  const maxLength = scale === 1 ? 25 : scale === 2 ? 60 : 100;
  const truncatedTitle = title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
  
  const testId = "tile-content";
  
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex h-full w-full items-center justify-center px-4",
        isSelected && "ring-2 ring-primary rounded-lg"
      )}
    >
      <h3 className={cn(
        "text-center truncate",
        baseFontSize,
        fontWeight,
        textClasses
      )}>
        {truncatedTitle}
      </h3>
    </div>
  );
};