import type { ReactNode } from "react";
import { getDefaultStroke, getStrokeHexColor } from "~/app/map/Canvas/Tile/utils/stroke";
import { CoordSystem, type Direction } from "~/lib/domains/mapping/utils";
import { renderStaticTileGradients } from "~/app/map/Canvas/Tile/Base/gradient";

export type TileCursor =
  | "cursor-pointer"
  | "cursor-grab" // for draggable tiles
  | "cursor-grabbing" // for dragging tiles
  | "cursor-move" // for drag tool
  | "cursor-crosshair" // for delete tool
  | "cursor-not-allowed" // for locked tiles
  | "cursor-zoom-in" // for expandable tiles
  | "cursor-zoom-out" // for expanded tiles
  | "cursor-cell" // for create tool
  | "cursor-text"; // for edit tool

export type TileStroke = {
  color: "transparent" | "zinc-950" | "zinc-900" | "zinc-800" | "zinc-50";
  width: number;
};

export type TileScale = -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type TileColor = {
  color: "zinc" | "amber" | "green" | "fuchsia" | "rose" | "indigo" | "cyan";
  tint:
    | "50"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900"
    | "950";
};

export interface BaseTileLayoutProps {
  coordId: string;
  scale: TileScale;
  color?: TileColor | string; // Allow both old format and new semantic format
  stroke?: TileStroke;
  children?: ReactNode;
  cursor?: TileCursor;
  isFocusable?: boolean;
  baseHexSize?: number;
  _shallow?: boolean;
  isExpanded?: boolean;
  isDarkMode?: boolean;
  isComposed?: boolean;
}

export const BaseTileLayout = ({
  coordId = "0,0",
  scale = 1,
  color,
  stroke = undefined,
  children,
  cursor = "cursor-pointer",
  isFocusable = false,
  baseHexSize = 50,
  _shallow = false,
  isExpanded = false,
  isComposed = false,
}: BaseTileLayoutProps) => {
  // Calculate default stroke based on scale, expansion, and shallow state
  const defaultStroke = getDefaultStroke(scale, isExpanded, _shallow);
  
  const finalStroke = stroke ?? defaultStroke;
  
  // Parse coordinate to get direction info
  // Handle special coordIds that don't follow the normal pattern
  let coord;
  let lastDirection: Direction | null = null;
  let hasPath = false;
  
  try {
    coord = CoordSystem.parseId(coordId);
    lastDirection = coord.path.length > 0 ? coord.path[coord.path.length - 1]! : null;
    hasPath = coord.path.length > 0;
  } catch {
    // For special tiles like "auth-static", use default values
    coord = { userId: 0, groupId: 0, path: [] };
  }
  // Calculate dimensions based on scale
  const width =
    scale === 1
      ? baseHexSize * Math.sqrt(3)
      : baseHexSize * Math.sqrt(3) * Math.pow(3, scale - 1);

  const height =
    scale === 1 ? baseHexSize * 2 : baseHexSize * 2 * Math.pow(3, scale - 1);

  // SVG constants
  const svgPath = "M50 0 L100 28.87 L100 86.6 L50 115.47 L0 86.6 L0 28.87Z";
  const svgViewBox = "0 0 100 115.47";
  // Handle both old format (color object) and new format (semantic string)
  const fillClass = color
    ? typeof color === 'string'
      ? `fill-${color}` // New semantic format like "nw-depth-1"
      : `fill-${color.color}-${color.tint}` // Old format
    : "fill-transparent";

  return (
    <div
      className={`flex flex-col items-center justify-center ${cursor}`}
      tabIndex={isFocusable ? 0 : undefined}
      role={isFocusable ? "button" : undefined}
      aria-label={isFocusable ? `Tile ${coordId}` : undefined}
      style={{
        width: `${Math.round(width)}px`,
        height,
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
      }}
      data-tile-id={coordId}
    >
      <div
        className={`relative flex flex-shrink-0 items-center justify-center p-0`}
        style={{
          width: "100%", // Ensure inner div takes full size of focusable parent
          height: "100%",
        }}
      >
        <svg
          className={`absolute inset-0 h-full w-full pointer-events-none`} // SVG is absolute to fill the focusable div
          // style={{ zIndex: 20 - scale }} // SVG zIndex
          viewBox={svgViewBox}
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {renderStaticTileGradients({ coordId, isExpanded, isShallow: _shallow, hasPath, lastDirection, scale })}
          </defs>
          <path
            d={svgPath}
            className={`transition-all duration-300 ${fillClass}`}
            stroke={getStrokeHexColor(finalStroke.color)}
            strokeWidth={finalStroke.width}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            fill={color ? undefined : "none"}
            strokeDasharray={isComposed ? "5,5" : undefined}
          />
          {/* Gradient overlay for faceted effect */}
          {(color ?? (isExpanded && !_shallow)) && (
            <>
              <path
                d={svgPath}
                fill={`url(#tile-gradient-${coordId}-light)`}
                stroke="none"
                className="pointer-events-none dark:hidden"
              />
              <path
                d={svgPath}
                fill={`url(#tile-gradient-${coordId}-dark)`}
                stroke="none"
                className="pointer-events-none hidden dark:block"
              />
            </>
          )}
        </svg>

        <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};