'use client';

import { Globe, Lock } from 'lucide-react';
import { Visibility } from '~/lib/domains/mapping/utils';
import { TileTooltip } from '~/app/map/Canvas/_internals/TileTooltip';

interface VisibilityIndicatorProps {
  visibility: Visibility;
  scale: number;
}

export function VisibilityIndicator({ visibility, scale }: VisibilityIndicatorProps) {
  const isPublic = visibility === Visibility.PUBLIC;
  const iconSize = scale >= 2 ? 14 : 10;
  const tooltipTitle = isPublic ? "Public" : "Private";
  const tooltipPreview = isPublic
    ? "Anyone can view this tile. Child tiles only show their visibility when it differs from this one."
    : "Only you can view this tile. Child tiles only show their visibility when it differs from this one.";

  return (
    <div
      className="absolute top-0 pointer-events-auto z-50"
      style={{
        left: `calc(50% - ${scale >= 2 ? 7 : 5}px)`,
        marginTop: scale >= 2 ? 8 : 4,
      }}
    >
      <TileTooltip title={tooltipTitle} preview={tooltipPreview}>
        {isPublic ? (
          <Globe
            size={iconSize}
            className="opacity-60 text-neutral-500 dark:text-neutral-400 cursor-help"
          />
        ) : (
          <Lock
            size={iconSize}
            className="opacity-60 text-neutral-500 dark:text-neutral-400 cursor-help"
          />
        )}
      </TileTooltip>
    </div>
  );
}
