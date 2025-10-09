'use client';

import { DraggableTilePreview, TilePreview } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface TilePreviewSectionProps {
  mode: 'view' | 'edit' | 'create';
  tileId?: string;
  tileColor?: string;
  isTogglable: boolean;
}

export function _TilePreviewSection({
  mode,
  tileId,
  tileColor,
  isTogglable,
}: TilePreviewSectionProps) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {mode === 'create' ? (
        <TilePreview
          tileColor={tileColor}
          size={10}
          className="flex-shrink-0"
        />
      ) : (
        <DraggableTilePreview
          tileId={tileId!}
          tileColor={tileColor}
          size={10}
          className="flex-shrink-0"
          cursor={isTogglable ? "cursor-pointer" : undefined}
        />
      )}
    </div>
  );
}
