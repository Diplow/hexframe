'use client';

import { TilePreview } from '~/app/map/Chat/Timeline/Widgets/_shared/TilePreview';

interface HeaderIconProps {
  icon?: React.ReactNode;
}

export function HeaderIcon({ icon }: HeaderIconProps) {
  if (icon) {
    return <div className="flex-shrink-0">{icon}</div>;
  }

  return (
    <div className="flex-shrink-0">
      <TilePreview size={8} className="opacity-60" />
    </div>
  );
}
