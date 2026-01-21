'use client';

import type { StatusFilter as StatusFilterType } from '~/app/map/Chat/Timeline/Widgets/RunsListWidget/_hooks/useRunsListState';

interface StatusFilterProps {
  value: StatusFilterType;
  onChange: (value: StatusFilterType) => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  const filters: Array<{ value: StatusFilterType; label: string }> = [
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
    { value: 'all', label: 'All' },
  ];

  return (
    <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            value === filter.value
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
