import { BaseTileLayout } from "~/app/map/Canvas/Tile/Base/BaseTileLayout";
import type { TileScale, TileColor } from "~/app/map/Canvas/Tile/Base/BaseTileLayout";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import { getColor } from "..";

export interface BaseEmptyTileProps {
  coordId: string;
  scale?: TileScale;
  baseHexSize?: number;
  showPreviewColor?: boolean;
  isDarkMode?: boolean;
}

/**
 * Non-interactive empty tile component for rendering without hooks or state
 * Used in contexts like loading skeletons where interactivity is not needed
 */
export const BaseEmptyTile = ({
  coordId,
  scale = 1,
  baseHexSize = 50,
  showPreviewColor = false,
  isDarkMode = false,
}: BaseEmptyTileProps) => {
  // Calculate the color this tile would have if something was here
  const targetCoords = CoordSystem.parseId(coordId);
  const previewColor = getColor(targetCoords);
  
  // Parse color for preview if needed
  const tileColor: TileColor | undefined = showPreviewColor && previewColor
    ? (() => {
        const [colorName, tint] = previewColor.split("-");
        return {
          color: colorName as TileColor["color"],
          tint: tint as TileColor["tint"]
        };
      })()
    : undefined;
  
  return (
    <div 
      className="group relative" 
      data-testid={`empty-tile-${coordId}`}
    >
      <BaseTileLayout
        coordId={coordId}
        scale={scale}
        cursor="cursor-pointer"
        color={tileColor}
        stroke={{ color: "transparent", width: 0 }}
        baseHexSize={baseHexSize}
        isFocusable={true}
        isDarkMode={isDarkMode}
      >
        <div className="absolute inset-0">
          {/* Clickable area with hexagon shape */}
          <div 
            className="pointer-events-auto absolute inset-0 z-10"
            style={{
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
            }}
          />
          
          {/* Semi-transparent overlay - no hover effects in base component */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
            }}
          />
          
          {/* Content area */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* No content in base empty tile */}
          </div>
        </div>
      </BaseTileLayout>
    </div>
  );
};