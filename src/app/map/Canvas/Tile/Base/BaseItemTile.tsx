import { BaseTileLayout } from "./BaseTileLayout";
import type { TileScale } from "./BaseTileLayout";
import type { TileData } from "~/app/map/types/tile-data";
import { getColorFromItem } from "~/app/map/Canvas/Tile/Item/_utils/color";
import { cn } from "~/lib/utils";
import { getTextColorForDepth } from "~/app/map/types/theme-colors";

export interface BaseItemTileProps {
  item: TileData;
  scale?: TileScale;
  baseHexSize?: number;
  isExpanded?: boolean;
  isSelected?: boolean;
  isDarkMode?: boolean;
}

/**
 * Non-interactive item tile component for rendering without hooks or state
 * Used in contexts like loading skeletons where interactivity is not needed
 */
export const BaseItemTile = ({
  item,
  scale = 1,
  baseHexSize = 50,
  isExpanded = false,
  isSelected = false,
  isDarkMode = false,
}: BaseItemTileProps) => {
  const tileColor = getColorFromItem(item);
  const depth = item.metadata.depth ?? 0;
  const textClasses = `break-words ${getTextColorForDepth(depth)}`;
  const title = item.data.name ?? 'Untitled';
  
  // Scale-based styling
  const baseFontSize = scale === 1 ? "text-xs" : scale === 2 ? "text-base" : "text-lg";
  const fontWeight = scale === 1 ? "font-medium" : scale === 2 ? "font-medium" : "font-semibold";
  
  return (
    <div 
      className="group relative" 
      data-testid={`tile-${item.metadata.dbId}`}
    >
      <BaseTileLayout
        coordId={item.metadata.coordId}
        scale={scale}
        color={tileColor}
        baseHexSize={baseHexSize}
        cursor="cursor-pointer"
        isFocusable={false}
        isExpanded={isExpanded}
        isDarkMode={isDarkMode}
      >
        <div
          data-testid="tile-content"
          className={cn(
            "flex h-full w-full items-center justify-center px-4",
            isSelected && "ring-2 ring-primary rounded-lg"
          )}
        >
          <h3 className={cn(
            "text-center break-words",
            baseFontSize,
            fontWeight,
            textClasses
          )}>
            {title}
          </h3>
        </div>
      </BaseTileLayout>
    </div>
  );
};