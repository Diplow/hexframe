"use client";

import { useState } from "react";
import type { Coord } from "~/lib/domains/mapping/utils";
import { api } from "~/commons/trpc/react";
import {
  HistoryLoadingState,
  HistoryErrorState,
  HistoryEmptyState,
  HistoricalVersionBanner,
  VersionListItem,
} from "~/app/map/Canvas/Tile/Item/_components/_history-states";
import {
  VersionDetailHeader,
  VersionField,
  VersionLinkField,
  VersionListHeader,
} from "~/app/map/Canvas/Tile/Item/_components/_history-components";

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

  // Fetch history list
  const { data: historyData, isLoading, error } = api.map.items.getItemHistory.useQuery({
    coords,
    limit: 50,
    offset: 0,
  });

  // Fetch selected version details
  const { data: versionData, isLoading: isLoadingVersion } = api.map.items.getItemVersion.useQuery(
    {
      coords,
      versionNumber: selectedVersionNumber!,
    },
    {
      enabled: selectedVersionNumber !== null,
    }
  );

  if (isLoading) return <HistoryLoadingState />;
  if (error) return <HistoryErrorState onClose={onClose} />;
  if (!historyData?.versions || historyData.versions.length === 0) {
    return <HistoryEmptyState onClose={onClose} />;
  }

  // Version detail view
  if (selectedVersionNumber !== null && versionData) {
    return (
      <div className="p-6">
        <VersionDetailHeader
          versionNumber={versionData.versionNumber}
          onBack={() => setSelectedVersionNumber(null)}
          onClose={onClose}
        />
        <HistoricalVersionBanner />
        <div className="space-y-4">
          <VersionField label="Title" value={versionData.title || "Untitled"} />
          <VersionField label="Preview" value={versionData.preview} />
          <VersionField label="Content" value={versionData.content} />
          <VersionLinkField link={versionData.link} />
          <VersionField
            label="Created"
            value={new Date(versionData.createdAt).toLocaleString()}
          />
        </div>
      </div>
    );
  }

  // Version list view
  return (
    <div className="p-6">
      <VersionListHeader onClose={onClose} />
      {isLoadingVersion && (
        <div className="text-center py-4 text-[color:var(--text-color-600)]">
          Loading version...
        </div>
      )}
      <ul className="space-y-2" role="list" aria-label="Version history">
        {historyData.versions.map((version) => (
          <VersionListItem
            key={version.versionNumber}
            version={version}
            onClick={() => setSelectedVersionNumber(version.versionNumber)}
          />
        ))}
      </ul>
    </div>
  );
}
