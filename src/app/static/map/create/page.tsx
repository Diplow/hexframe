import { notFound } from "next/navigation";
import { api } from "~/commons/trpc/server";
import { StaticCreateItemForm } from "./create-item";
import { CoordSystem } from "~/lib/domains/mapping/utils/hex-coordinates";

interface CreateItemPageProps {
  searchParams: Promise<{
    center?: string;
    coordId?: string;
    parentId?: string;
    returnTo?: string;
  }>;
}

export default async function CreateItemPage({
  searchParams,
}: CreateItemPageProps) {
  const { center: rootItemId, coordId, parentId, returnTo } = await searchParams;
  
  if (!rootItemId) {
    return notFound();
  }

  // Validate parent item if provided
  let parentItem = null;
  if (parentId) {
    try {
      parentItem = await api.map.getRootItemById({
        mapItemId: parseInt(parentId),
      });
    } catch {
      return notFound();
    }
  }

  // Determine target coordinates
  const targetCoords = coordId ? CoordSystem.parseId(coordId) : null;

  if (!targetCoords) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <div className="container mx-auto max-w-5xl p-6">
        <StaticCreateItemForm
          targetCoords={targetCoords}
          parentItem={parentItem}
          returnUrl={returnTo ?? `/static/map?center=${rootItemId}`}
          rootItemId={rootItemId}
        />
      </div>
    </div>
  );
}