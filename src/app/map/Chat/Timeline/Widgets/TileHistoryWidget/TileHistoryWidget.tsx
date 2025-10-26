"use client";

import { useState } from "react";
import { History } from "lucide-react";
import type { Coord } from "~/lib/domains/mapping/utils";
import { api } from "~/commons/trpc/react";
import { BaseWidget, WidgetHeader, WidgetContent } from "~/app/map/Chat/Timeline/Widgets";
import {
  _HistoryLoadingState,
  _HistoryErrorState,
  _HistoryEmptyState,
  _VersionDetail,
  _VersionListItem,
} from "~/app/map/Chat/Timeline/Widgets/TileHistoryWidget/_history-internals";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import { useMapCache } from "~/app/map/Cache";

interface TileHistoryViewProps {
  coords: Coord;
  onClose: () => void;
}

/**
 * Displays version history for a tile
 * Shows timeline/list of versions and allows viewing specific historical versions
 */
export function TileHistoryView({ coords, onClose }: TileHistoryViewProps) {
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);
  const { getItem, updateItemOptimistic } = useMapCache();
  const utils = api.useUtils();

  const coordId = CoordSystem.createId(coords);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const currentItem = getItem(coordId);

  const { data: historyData, isLoading, error } = api.map.items.getItemHistory.useQuery({
    coords,
    limit: 50,
    offset: 0,
  });

  const { data: versionData } = api.map.items.getItemVersion.useQuery(
    {
      coords,
      versionNumber: selectedVersionNumber!,
    },
    {
      enabled: selectedVersionNumber !== null,
    }
  );

  const handleRestore = async (version: typeof versionData) => {
    if (!version) return;

    // Update the tile with the historical version's data
    await updateItemOptimistic(coordId, {
      title: version.title ?? undefined,
      content: version.content ?? undefined,
    });

    // Invalidate queries to refresh the data
    await utils.map.items.getItemHistory.invalidate({ coords });

    // Close history view after restore
    setSelectedVersionNumber(null);
    onClose();
  };

  if (isLoading) return <_HistoryLoadingState onClose={onClose} />;
  if (error) return <_HistoryErrorState onClose={onClose} />;
  if (!historyData?.versions || historyData.versions.length === 0) {
    return <_HistoryEmptyState onClose={onClose} />;
  }

  // Create a "current version" from the current item data
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const currentVersion = currentItem ? {
    versionNumber: 0, // Use 0 to indicate current
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    title: currentItem.data.title,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    preview: currentItem.data.preview,
    createdAt: new Date(), // Current time
  } : null;

  if (selectedVersionNumber !== null && versionData) {
    return (
      <_VersionDetail
        versionData={versionData}
        onClose={() => setSelectedVersionNumber(null)}
        onRestore={() => void handleRestore(versionData)}
      />
    );
  }

  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<History className="h-5 w-5 text-primary" />}
        title="Version History"
        onClose={onClose}
      />
      <WidgetContent>
        <div className="space-y-2">
          {currentVersion && (
            <_VersionListItem
              key="current"
              version={currentVersion}
              isCurrent={true}
              onClick={() => { /* Current version is not clickable */ }}
            />
          )}
          {historyData.versions.map((version) => (
            <_VersionListItem
              key={version.versionNumber}
              version={version}
              isCurrent={false}
              onClick={() => setSelectedVersionNumber(version.versionNumber)}
            />
          ))}
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}
