'use client';

import { CheckCircle2, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import type { ExecutedStep } from '~/app/map/Chat/Timeline/Widgets/RunWidget/useRunWidget';

interface StepsListProps {
  steps: ExecutedStep[];
  onNavigateToTile?: (coords: string) => void;
}

function _getStatusIcon(status: ExecutedStep['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    case 'blocked':
      return <AlertTriangle className="h-3.5 w-3.5 text-secondary" />;
    case 'error':
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  }
}

export function StepsList({ steps, onNavigateToTile }: StepsListProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
        Executed Steps
      </span>
      <ul className="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
        {steps.map((step, index) => (
          <li
            key={`${step.coords}-${index}`}
            className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-md text-sm"
          >
            {_getStatusIcon(step.status)}
            <button
              type="button"
              onClick={() => onNavigateToTile?.(step.coords)}
              className="flex items-center gap-1 text-primary hover:underline truncate"
            >
              <span className="truncate">{step.title}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
