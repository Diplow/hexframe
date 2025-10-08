import { X } from 'lucide-react';
import type { Filter } from '~/app/map/Chat/Timeline/Widgets/DebugLogsWidget/_hooks/useDebugLogsState';

interface FilterTagsProps {
  filters: Filter[];
  onRemoveFilter: (id: string) => void;
}

export function FilterTags({ filters, onRemoveFilter }: FilterTagsProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <div
          key={filter.id}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-md"
        >
          <span>{filter.isNegative ? '!' : ''}{filter.text}</span>
          <button
            type="button"
            onClick={() => onRemoveFilter(filter.id)}
            className="hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
