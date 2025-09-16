'use client';

import { BaseTileLayout } from '~/app/map/Canvas';
import type { TileCursor } from '~/app/map/Canvas/Tile';

interface TilePreviewProps {
  tileColor?: string;
  size?: number;
  className?: string;
  cursor?: TileCursor;
}

export function TilePreview({
  tileColor,
  size = 10,
  className,
  cursor = "cursor-pointer"
}: TilePreviewProps) {
  return (
    <div className={className}>
      <BaseTileLayout
        coordId="preview-0,0"
        scale={1}
        color={tileColor}
        stroke={{ color: "transparent" as const, width: 0 }}
        baseHexSize={size}
        cursor={cursor}
      />
    </div>
  );
}