import { Clock } from "lucide-react";

// Loading State Component
export function HistoryLoadingState() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-[color:var(--text-color-600)]">Loading version history...</div>
    </div>
  );
}

// Error State Component
export function HistoryErrorState({ onClose }: { onClose: () => void }) {
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

// Empty State Component
export function HistoryEmptyState({ onClose }: { onClose: () => void }) {
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

// Historical Version Banner
export function HistoricalVersionBanner() {
  return (
    <div className="mb-4 p-3 bg-[color:var(--warning-color-100)] dark:bg-[color:var(--warning-color-900)] border border-[color:var(--warning-color-300)] dark:border-[color:var(--warning-color-700)] rounded">
      <div className="flex items-center gap-2 text-[color:var(--warning-color-800)] dark:text-[color:var(--warning-color-200)]">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">Historical Version (Read-Only)</span>
      </div>
    </div>
  );
}

// Version List Item
export function VersionListItem({
  version,
  onClick,
}: {
  version: { versionNumber: number; title: string; createdAt: Date };
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
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
  );
}
