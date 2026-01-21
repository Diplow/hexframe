'use client';

import { useState, useCallback } from 'react';
import { List, RefreshCw, AlertCircle } from 'lucide-react';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';
import { useRunsListState } from '~/app/map/Chat/Timeline/Widgets/RunsListWidget/_hooks/useRunsListState';
import { StatusFilter } from '~/app/map/Chat/Timeline/Widgets/RunsListWidget/_components/StatusFilter';
import { RunItem } from '~/app/map/Chat/Timeline/Widgets/RunsListWidget/_components/RunItem';

interface RunsListWidgetProps {
  onClose?: () => void;
  onOpenRun?: (coords: string, title: string) => void;
}

export function RunsListWidget({ onClose, onOpenRun }: RunsListWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    runs,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    handleRefresh,
  } = useRunsListState();

  const handleRunClick = useCallback((coords: string) => {
    // Title will be fetched by the RunWidget
    onOpenRun?.(coords, 'Loading...');
  }, [onOpenRun]);

  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<List className="h-5 w-5 text-primary" />}
        title="Runs"
        onClose={onClose}
        collapsible={true}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <WidgetContent isCollapsed={isCollapsed}>
        <div className="flex flex-col gap-3">
          {/* Filter and refresh controls */}
          <div className="flex items-center justify-between gap-2">
            <StatusFilter value={statusFilter} onChange={setStatusFilter} />
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              aria-label="Refresh runs"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && runs.length === 0 && (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              <List className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No runs found</p>
              <p className="text-xs mt-1">
                {statusFilter === 'active'
                  ? 'Start a run by executing a SYSTEM tile'
                  : statusFilter === 'closed'
                    ? 'No closed runs yet'
                    : 'No runs in the system'}
              </p>
            </div>
          )}

          {/* Runs list */}
          {!isLoading && runs.length > 0 && (
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
              {runs.map((run) => (
                <RunItem key={run.id} run={run} onClick={handleRunClick} />
              ))}
            </div>
          )}
        </div>
      </WidgetContent>
    </BaseWidget>
  );
}
