import type { ReactNode } from "react";
import type { TileData } from "~/app/map/types/tile-data";
import type { DynamicFrameCoreProps } from "~/app/map/Canvas/DynamicFrameCore";

interface TileWithNeighborsProps {
  centerTile: ReactNode;
  centerItem: TileData;
  showNeighbors: boolean;
  renderNeighbors?: DynamicFrameCoreProps["renderNeighbors"];
  neighborProps: Parameters<NonNullable<DynamicFrameCoreProps["renderNeighbors"]>>[1];
}

export function TileWithNeighbors({
  centerTile,
  centerItem,
  showNeighbors,
  renderNeighbors,
  neighborProps,
}: TileWithNeighborsProps) {
  // If neighbors are disabled or no render function provided, just return the center tile
  if (!showNeighbors || !renderNeighbors) {
    return <>{centerTile}</>;
  }

  // With neighbors enabled, wrap in a container that can handle overflow
  return (
    <div className="relative" style={{ zIndex: 10 }}>
      {/* Center tile (highest z-index) */}
      <div style={{ position: "relative", zIndex: 10 }}>{centerTile}</div>

      {/* Neighbor tiles (lower z-index, positioned around center) */}
      {renderNeighbors(centerItem, neighborProps)}
    </div>
  );
}
