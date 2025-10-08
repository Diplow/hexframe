'use client';

import { LogFilters } from '~/app/map/Chat/Timeline/Widgets/DebugLogsWidget/_components/LogFilters';
import type { Filter } from '~/app/map/Chat/Timeline/Widgets/DebugLogsWidget/_hooks/useDebugLogsState';

interface InteractiveLogsProps {
  logs: string;
  mode: 'full' | 'succinct';
  showAll: boolean;
  filters: Filter[];
  filterInput: string;
  onModeChange: (mode: 'full' | 'succinct') => void;
  onShowAllChange: (showAll: boolean) => void;
  onFilterInputChange: (value: string) => void;
  onAddFilter: () => void;
  onRemoveFilter: (id: string) => void;
  onCopy: () => void;
}

export function InteractiveLogs({
  logs,
  mode,
  showAll,
  filters,
  filterInput,
  onModeChange,
  onShowAllChange,
  onFilterInputChange,
  onAddFilter,
  onRemoveFilter,
  onCopy,
}: InteractiveLogsProps) {
  return (
    <div className="space-y-4">
      {/* Controls at the top */}
      <LogFilters
        mode={mode}
        showAll={showAll}
        filters={filters}
        filterInput={filterInput}
        onModeChange={onModeChange}
        onShowAllChange={onShowAllChange}
        onFilterInputChange={onFilterInputChange}
        onAddFilter={onAddFilter}
        onRemoveFilter={onRemoveFilter}
        onCopy={onCopy}
      />

      {/* Logs display */}
      <pre className="bg-neutral-100 dark:bg-neutral-700 p-3 rounded text-sm overflow-x-auto">
        <code>{logs}</code>
      </pre>
    </div>
  );
}
