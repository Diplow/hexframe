'use client';

import { BaseTileLayout } from '~/app/map/Canvas';

interface TilePreviewProps {
  tileColor?: string;
  size?: number;
  className?: string;
}

export function TilePreview({
  tileColor,
  size = 10,
  className
}: TilePreviewProps) {
  return (
    <div className={className}>
      <BaseTileLayout
        coordId="preview-0,0"
        scale={1}
        color={tileColor}
        stroke={{ color: "transparent" as const, width: 0 }}
        baseHexSize={size}
        cursor="cursor-pointer"
      />
    </div>
  );
}