'use client';

import type { Filter } from '~/app/map/Chat/Timeline/Widgets/DebugLogsWidget/_hooks/useDebugLogsState';
import { FilterToggles } from '~/app/map/Chat/Timeline/Widgets/DebugLogsWidget/_components/FilterToggles';
import { FilterTags } from '~/app/map/Chat/Timeline/Widgets/DebugLogsWidget/_components/FilterTags';

interface LogFiltersProps {
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

export function LogFilters({
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
}: LogFiltersProps) {
  const handleFilterKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAddFilter();
    }
  };

  return (
    <div className="space-y-3">
      <FilterToggles
        mode={mode}
        showAll={showAll}
        onModeChange={onModeChange}
        onShowAllChange={onShowAllChange}
        onCopy={onCopy}
      />

      {/* Filter Input and Tags */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filterInput}
            onChange={(e) => onFilterInputChange(e.target.value)}
            onKeyDown={handleFilterKeyDown}
            placeholder="Add filter (e.g., [API] or ![RENDER])"
            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={onAddFilter}
            className="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral border border-neutral-200 dark:border-neutral-600 transition-colors"
          >
            Add
          </button>
        </div>

        <FilterTags filters={filters} onRemoveFilter={onRemoveFilter} />
      </div>
    </div>
  );
}
