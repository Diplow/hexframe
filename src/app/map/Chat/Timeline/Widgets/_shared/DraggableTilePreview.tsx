'use client';

import { TilePreview } from '~/app/map/Chat/Timeline/Widgets/_shared/TilePreview';
import type { TileCursor } from '~/app/map/Canvas';

interface DraggableTilePreviewProps {
  tileId: string;
  tileColor?: string;
  size?: number;
  className?: string;
  cursor?: TileCursor;
}

export function DraggableTilePreview({
  tileId,
  tileColor,
  size = 10,
  className,
  cursor = "cursor-pointer"
}: DraggableTilePreviewProps) {

  return (
    <div
      className={className}
      data-tile-id={tileId}
    >
      <TilePreview
        tileColor={tileColor}
        size={size}
        cursor={cursor}
      />
    </div>
  );
}