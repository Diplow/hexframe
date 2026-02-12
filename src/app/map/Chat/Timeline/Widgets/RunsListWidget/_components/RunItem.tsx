'use client';

import { formatDistanceToNow } from 'date-fns';
import type { RunListItem } from '~/app/map/Chat/Timeline/Widgets/RunsListWidget/_hooks/useRunsListState';

interface RunItemProps {
  run: RunListItem;
  onClick: (coords: string) => void;
  onClose: (runId: string) => void;
  onReopen: (runId: string) => void;
}

function _getStatusIndicator(status: string) {
  switch (status) {
    case 'open':
      return { color: 'bg-green-500', label: 'Running' };
    case 'blocked':
      return { color: 'bg-yellow-500', label: 'Blocked' };
    case 'closed':
      return { color: 'bg-neutral-400 dark:bg-neutral-600', label: 'Closed' };
    default:
      return { color: 'bg-neutral-400', label: 'Unknown' };
  }
}

export function RunItem({ run, onClick, onClose, onReopen }: RunItemProps) {
  const statusIndicator = _getStatusIndicator(run.status);
  const timeAgo = formatDistanceToNow(new Date(run.updatedAt), { addSuffix: true });
  const isClosed = run.status === 'closed';

  function handleActionClick(event: React.MouseEvent) {
    event.stopPropagation();
    if (isClosed) {
      onReopen(run.id);
    } else {
      onClose(run.id);
    }
  }

  return (
    <button
      type="button"
      onClick={() => onClick(run.rootCoords)}
      className="w-full text-left p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
    >
      <div className="flex items-start gap-2">
        <div
          className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${statusIndicator.color}`}
          title={statusIndicator.label}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">
              {run.title}
            </span>
            {run.totalSteps > 0 && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                {run.stepsCompleted}/{run.totalSteps} steps
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {timeAgo}
            </span>
            {run.status === 'blocked' && run.blockageReason && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400 truncate">
                {run.blockageReason}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleActionClick}
          className="flex-shrink-0 px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        >
          {isClosed ? 'Reopen' : 'Close'}
        </button>
      </div>
    </button>
  );
}
