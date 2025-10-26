"use client";

import { useState } from "react";
import { ArrowLeft, X, Clock } from "lucide-react";
import type { Coord } from "~/lib/domains/mapping/utils";
import { api } from "~/commons/trpc/react";

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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[color:var(--text-color-600)]">Loading version history...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <div className="text-[color:var(--destructive-color-600)]">
          Error: Failed to load version history
        </div>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-[color:var(--bg-color-100)] rounded hover:bg-[color:var(--bg-color-200)]"
        >
          Close
        </button>
      </div>
    );
  }

  // Empty state
  if (!historyData?.versions || historyData.versions.length === 0) {
    return (
      <div className="p-8">
        <div className="text-[color:var(--text-color-600)]">No version history available</div>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-[color:var(--bg-color-100)] rounded hover:bg-[color:var(--bg-color-200)]"
        >
          Close
        </button>
      </div>
    );
  }

  // Version detail view
  if (selectedVersionNumber !== null && versionData) {
    return (
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedVersionNumber(null)}
              className="p-2 hover:bg-[color:var(--bg-color-100)] rounded"
              aria-label="Back to version list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold">Version {versionData.versionNumber}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[color:var(--bg-color-100)] rounded"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Historical version indicator */}
        <div className="mb-4 p-3 bg-[color:var(--warning-color-100)] dark:bg-[color:var(--warning-color-900)] border border-[color:var(--warning-color-300)] dark:border-[color:var(--warning-color-700)] rounded">
          <div className="flex items-center gap-2 text-[color:var(--warning-color-800)] dark:text-[color:var(--warning-color-200)]">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Historical Version (Read-Only)</span>
          </div>
        </div>

        {/* Version details */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[color:var(--text-color-700)] dark:text-[color:var(--text-color-300)] mb-1">
              Title
            </label>
            <div className="p-3 bg-[color:var(--bg-color-50)] dark:bg-[color:var(--bg-color-800)] rounded border border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)]">
              {versionData.title || "Untitled"}
            </div>
          </div>

          {versionData.preview && (
            <div>
              <label className="block text-sm font-medium text-[color:var(--text-color-700)] dark:text-[color:var(--text-color-300)] mb-1">
                Preview
              </label>
              <div className="p-3 bg-[color:var(--bg-color-50)] dark:bg-[color:var(--bg-color-800)] rounded border border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)]">
                {versionData.preview}
              </div>
            </div>
          )}

          {versionData.content && (
            <div>
              <label className="block text-sm font-medium text-[color:var(--text-color-700)] dark:text-[color:var(--text-color-300)] mb-1">
                Content
              </label>
              <div className="p-3 bg-[color:var(--bg-color-50)] dark:bg-[color:var(--bg-color-800)] rounded border border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)] whitespace-pre-wrap">
                {versionData.content}
              </div>
            </div>
          )}

          {versionData.link && (
            <div>
              <label className="block text-sm font-medium text-[color:var(--text-color-700)] dark:text-[color:var(--text-color-300)] mb-1">
                Link
              </label>
              <div className="p-3 bg-[color:var(--bg-color-50)] dark:bg-[color:var(--bg-color-800)] rounded border border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)]">
                <a
                  href={versionData.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[color:var(--primary-color-600)] hover:underline"
                >
                  {versionData.link}
                </a>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[color:var(--text-color-700)] dark:text-[color:var(--text-color-300)] mb-1">
              Created
            </label>
            <div className="p-3 bg-[color:var(--bg-color-50)] dark:bg-[color:var(--bg-color-800)] rounded border border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)]">
              {new Date(versionData.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Version list view
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Version History</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-[color:var(--bg-color-100)] rounded"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Version list */}
      {isLoadingVersion && (
        <div className="text-center py-4 text-[color:var(--text-color-600)]">
          Loading version...
        </div>
      )}

      <ul className="space-y-2" role="list" aria-label="Version history">
        {historyData.versions.map((version) => (
          <li key={version.versionNumber}>
            <button
              onClick={() => setSelectedVersionNumber(version.versionNumber)}
              className="w-full p-4 text-left bg-[color:var(--bg-color-50)] dark:bg-[color:var(--bg-color-800)] hover:bg-[color:var(--bg-color-100)] dark:hover:bg-[color:var(--bg-color-700)] rounded border border-[color:var(--stroke-color-200)] dark:border-[color:var(--stroke-color-700)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-[color:var(--text-color-900)] dark:text-[color:var(--text-color-100)]">
                    {version.title || "Untitled"}
                  </div>
                  <div className="text-sm text-[color:var(--text-color-600)] dark:text-[color:var(--text-color-400)] mt-1">
                    Version {version.versionNumber} • {new Date(version.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <Clock className="w-4 h-4 text-[color:var(--text-color-400)] flex-shrink-0 ml-2 mt-1" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
