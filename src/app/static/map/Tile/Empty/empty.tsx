import Link from "next/link";
import { Plus } from "lucide-react";
import { StaticBaseTileLayout, type TileScale } from "~/app/static/map/Tile/Base/base";
import type { URLInfo } from "~/app/map/types/url-info";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";

interface StaticEmptyTileProps {
  coordId: string;
  scale?: TileScale;
  baseHexSize?: number;
  urlInfo: URLInfo;
  parentItem?: { id: string; name: string };
  interactive?: boolean;
  currentUserId?: number;
}

export function StaticEmptyTile({
  coordId,
  scale = 1,
  baseHexSize = 50,
  urlInfo,
  parentItem,
  interactive = true,
  currentUserId,
}: StaticEmptyTileProps) {
  // Create URL for static create page with action metadata
  const createParams = new URLSearchParams({
    center: urlInfo.rootItemId,
    coordId,
    ...(parentItem && { parentId: parentItem.id }),
    returnTo: `${urlInfo.pathname}?${urlInfo.searchParamsString}`,
    _action: "create",
    _coordId: coordId,
    ...(parentItem && { _parentName: parentItem.name }),
  });
  const createUrl = `/static/map/create?${createParams.toString()}`;

  // Check if the user owns this coordinate space
  const coord = CoordSystem.parseId(coordId);
  const userOwnsThisSpace =
    currentUserId !== undefined && coord.userId === currentUserId;

  return (
    <div className="group relative hover:z-10">
      {/* Invisible hover area overlay to ensure full tile responds to hover */}
      <div className="pointer-events-auto absolute inset-0 z-10" />

      <StaticBaseTileLayout
        coordId={coordId}
        scale={scale}
        color={{ color: "zinc", tint: "100" }}
        stroke={{ color: "zinc-950", width: 1 }}
        cursor="cursor-pointer"
        baseHexSize={baseHexSize}
        isFocusable={true}
      >
        <EmptyTileContent
          createUrl={createUrl}
          parentItem={parentItem}
          interactive={interactive}
          userOwnsThisSpace={userOwnsThisSpace}
        />
      </StaticBaseTileLayout>
    </div>
  );
}

interface EmptyTileContentProps {
  createUrl: string;
  parentItem?: { id: string; name: string };
  interactive: boolean;
  userOwnsThisSpace: boolean;
}

function EmptyTileContent({
  createUrl,
  parentItem,
  interactive,
  userOwnsThisSpace,
}: EmptyTileContentProps) {
  if (!interactive) {
    return (
      <div className="flex h-full w-full items-center justify-center text-neutral-400">
        <div className="text-center">
          <div className="text-xs opacity-50">Empty</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      {userOwnsThisSpace ? (
        <Link
          href={createUrl}
          className="create-button pointer-events-auto relative z-20 flex h-8 w-8 items-center justify-center rounded-full bg-success-500 text-white opacity-70 shadow-lg transition-opacity duration-200 hover:bg-success-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-success-400 group-hover:opacity-100"
          aria-label={`Create new item${parentItem ? ` under ${parentItem.name}` : ""}`}
          title={`Create new item${parentItem ? ` under ${parentItem.name}` : ""}`}
        >
          <Plus size={16} />
        </Link>
      ) : (
        <div className="text-center text-xs text-neutral-400">
          You don&apos;t own this space
        </div>
      )}
    </div>
  );
}
