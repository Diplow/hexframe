import type { ReactNode } from "react";
import { Direction } from "~/lib/domains/mapping/utils/hex-coordinates";
import type { TileScale } from "~/app/map/Canvas/Tile/Base/BaseTileLayout";

// Get gradient opacity multiplier based on scale
// Scale 3 = 1.0 (full strength), Scale 2 = 0.6, Scale 1 = 0.3
const getOpacityMultiplier = (scale: TileScale): number => {
  switch (scale) {
    case 3:
    case 4:
    case 5:
    case 6:
      return 1.0; // Full strength for large tiles
    case 2:
      return 0.9; // Medium strength
    case 1:
      return 0.75; // Soft for small tiles
    case 0:
    case -1:
    case -2:
      return 0.3; // Very soft for tiny tiles
    default:
      return 0.6;
  }
};

// Get gradient position based on direction
export const getGradientPosition = (direction: Direction) => {
  switch (direction) {
    case Direction.NorthWest:
      return { x1: "0%", y1: "0%", x2: "100%", y2: "100%" };
    case Direction.NorthEast:
      return { x1: "100%", y1: "0%", x2: "0%", y2: "100%" };
    case Direction.East:
      return { x1: "100%", y1: "50%", x2: "0%", y2: "50%" };
    case Direction.SouthEast:
      return { x1: "100%", y1: "100%", x2: "0%", y2: "0%" };
    case Direction.SouthWest:
      return { x1: "0%", y1: "100%", x2: "100%", y2: "0%" };
    case Direction.West:
      return { x1: "0%", y1: "50%", x2: "100%", y2: "50%" };
    default: // Center or no direction
      return { x1: "0%", y1: "0%", x2: "100%", y2: "100%" };
  }
};

// Render gradient definitions for dynamic tiles
export const renderTileGradient = (params: {
  coordId: string;
  isExpanded: boolean;
  isShallow: boolean;
  hasPath: boolean;
  lastDirection: Direction | null;
  isDarkMode: boolean;
  scale: TileScale;
}): ReactNode => {
  const { coordId, isExpanded, isShallow, hasPath, lastDirection, isDarkMode, scale } = params;
  const lightColor = isDarkMode ? "0,0,0" : "255,255,255";
  const darkColor = isDarkMode ? "255,255,255" : "0,0,0";
  const opacityMultiplier = getOpacityMultiplier(scale);
  
  if (isExpanded && !isShallow) {
    return (
      <radialGradient id={`tile-gradient-${coordId}`}>
        <stop offset="0%" stopColor={`rgba(${lightColor},${0.05 * opacityMultiplier})`} />
        <stop offset="100%" stopColor={`rgba(${darkColor},${0.1 * opacityMultiplier})`} />
      </radialGradient>
    );
  }
  
  if (hasPath && lastDirection !== null) {
    return (
      <linearGradient 
        id={`tile-gradient-${coordId}`} 
        {...getGradientPosition(lastDirection)}
      >
        <stop offset="0%" stopColor={`rgba(${lightColor},${0.15 * opacityMultiplier})`} />
        <stop offset="50%" stopColor={`rgba(${lightColor},${0.05 * opacityMultiplier})`} />
        <stop offset="100%" stopColor={`rgba(${darkColor},${0.1 * opacityMultiplier})`} />
      </linearGradient>
    );
  }
  
  return (
    <linearGradient id={`tile-gradient-${coordId}`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor={`rgba(${lightColor},${0.15 * opacityMultiplier})`} />
      <stop offset="50%" stopColor={`rgba(${lightColor},${0.05 * opacityMultiplier})`} />
      <stop offset="100%" stopColor={`rgba(${darkColor},${0.1 * opacityMultiplier})`} />
    </linearGradient>
  );
};

// Render gradient definitions for static tiles (supports both light and dark mode)
export const renderStaticTileGradients = (params: {
  coordId: string;
  isExpanded: boolean;
  isShallow: boolean;
  hasPath: boolean;
  lastDirection: Direction | null;
  scale: TileScale;
}): ReactNode => {
  const { coordId, isExpanded, isShallow, hasPath, lastDirection, scale } = params;
  const opacityMultiplier = getOpacityMultiplier(scale);
  if (isExpanded && !isShallow) {
    return (
      <>
        <radialGradient id={`tile-gradient-${coordId}-light`}>
          <stop offset="0%" stopColor={`rgba(255,255,255,${0.05 * opacityMultiplier})`} />
          <stop offset="100%" stopColor={`rgba(0,0,0,${0.1 * opacityMultiplier})`} />
        </radialGradient>
        <radialGradient id={`tile-gradient-${coordId}-dark`}>
          <stop offset="0%" stopColor={`rgba(0,0,0,${0.05 * opacityMultiplier})`} />
          <stop offset="100%" stopColor={`rgba(255,255,255,${0.1 * opacityMultiplier})`} />
        </radialGradient>
      </>
    );
  }
  
  if (hasPath && lastDirection !== null) {
    return (
      <>
        <linearGradient 
          id={`tile-gradient-${coordId}-light`} 
          {...getGradientPosition(lastDirection)}
        >
          <stop offset="0%" stopColor={`rgba(255,255,255,${0.15 * opacityMultiplier})`} />
          <stop offset="50%" stopColor={`rgba(255,255,255,${0.05 * opacityMultiplier})`} />
          <stop offset="100%" stopColor={`rgba(0,0,0,${0.1 * opacityMultiplier})`} />
        </linearGradient>
        <linearGradient 
          id={`tile-gradient-${coordId}-dark`} 
          {...getGradientPosition(lastDirection)}
        >
          <stop offset="0%" stopColor={`rgba(0,0,0,${0.15 * opacityMultiplier})`} />
          <stop offset="50%" stopColor={`rgba(0,0,0,${0.05 * opacityMultiplier})`} />
          <stop offset="100%" stopColor={`rgba(255,255,255,${0.1 * opacityMultiplier})`} />
        </linearGradient>
      </>
    );
  }
  
  return (
    <>
      <linearGradient id={`tile-gradient-${coordId}-light`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={`rgba(255,255,255,${0.15 * opacityMultiplier})`} />
        <stop offset="50%" stopColor={`rgba(255,255,255,${0.05 * opacityMultiplier})`} />
        <stop offset="100%" stopColor={`rgba(0,0,0,${0.1 * opacityMultiplier})`} />
      </linearGradient>
      <linearGradient id={`tile-gradient-${coordId}-dark`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={`rgba(0,0,0,${0.15 * opacityMultiplier})`} />
        <stop offset="50%" stopColor={`rgba(0,0,0,${0.05 * opacityMultiplier})`} />
        <stop offset="100%" stopColor={`rgba(255,255,255,${0.1 * opacityMultiplier})`} />
      </linearGradient>
    </>
  );
};