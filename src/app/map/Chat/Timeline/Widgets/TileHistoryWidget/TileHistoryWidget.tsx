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

  if (isLoading) return <_HistoryLoadingState onClose={onClose} />;
  if (error) return <_HistoryErrorState onClose={onClose} />;
  if (!historyData?.versions || historyData.versions.length === 0) {
    return <_HistoryEmptyState onClose={onClose} />;
  }

  if (selectedVersionNumber !== null && versionData) {
    return <_VersionDetail versionData={versionData} onClose={() => setSelectedVersionNumber(null)} />;
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
          {historyData.versions.map((version, index) => (
            <_VersionListItem
              key={version.versionNumber}
              version={version}
              isCurrent={index === 0}
              onClick={() => setSelectedVersionNumber(version.versionNumber)}
            />
          ))}
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}
