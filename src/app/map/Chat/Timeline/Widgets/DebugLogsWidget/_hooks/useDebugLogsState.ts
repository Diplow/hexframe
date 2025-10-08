import { useCallback, useEffect, useState } from 'react';
import { debugLogger } from '~/lib/debug/debug-logger';
import { stripTimestamp } from '~/app/map/Chat/Input';

export interface Filter {
  id: string;
  text: string;
  isNegative: boolean; // true for ![RENDER], false for [API]
}

export function useDebugLogsState() {
  const [logVersion, setLogVersion] = useState(0); // Force re-render when logs change
  const [mode, setMode] = useState<'full' | 'succinct'>('full');
  const [showAll, setShowAll] = useState(false);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [filterInput, setFilterInput] = useState('');

  // Subscribe to log updates - CRITICAL: Keep this callback minimal to avoid infinite loops
  useEffect(() => {
    const unsubscribe = debugLogger.subscribe(() => {
      // Only increment version, no other operations that could trigger logging
      setLogVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

  // Generate current logs based on state
  const getCurrentLogs = useCallback(() => {
    const logs = debugLogger.formatLogs(mode, showAll ? undefined : 100);
    if (logs.length === 0) {
      return 'No debug logs available.';
    }

    // Remove timestamps from individual log lines
    let cleanLogs = logs.map(stripTimestamp);

    // Apply custom filters
    cleanLogs = cleanLogs.filter(log => {
      const positiveFilters = filters.filter(f => !f.isNegative);
      const negativeFilters = filters.filter(f => f.isNegative);

      // If there are positive filters, log must match at least one (OR logic)
      const passesPositiveFilters = positiveFilters.length === 0 ||
        positiveFilters.some(filter => log.includes(filter.text));

      // Log must not match any negative filters (AND logic for exclusions)
      const passesNegativeFilters = negativeFilters.every(filter =>
        !log.includes(filter.text)
      );

      return passesPositiveFilters && passesNegativeFilters;
    });

    return cleanLogs.join('\n');
    // logVersion is intentionally included to trigger re-renders when logs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, showAll, filters, logVersion]);

  // Handle adding a filter
  const handleAddFilter = useCallback(() => {
    const trimmed = filterInput.trim();
    if (!trimmed) return;

    let filterText = trimmed;
    let isNegative = false;

    // Check for negative filter pattern ![TEXT]
    if (trimmed.startsWith('!')) {
      isNegative = true;
      filterText = trimmed.slice(1);
    }

    // Generate unique ID
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const newFilter: Filter = {
      id,
      text: filterText,
      isNegative
    };

    setFilters(prev => [...prev, newFilter]);
    setFilterInput('');
  }, [filterInput]);

  // Handle removing a filter
  const handleRemoveFilter = useCallback((id: string) => {
    setFilters(prev => prev.filter(filter => filter.id !== id));
  }, []);

  return {
    mode,
    setMode,
    showAll,
    setShowAll,
    filters,
    filterInput,
    setFilterInput,
    getCurrentLogs,
    handleAddFilter,
    handleRemoveFilter,
  };
}
