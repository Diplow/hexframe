'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
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

interface StepItemProps {
  step: ExecutedStep;
  onNavigateToTile?: (coords: string) => void;
}

function StepItem({ step, onNavigateToTile }: StepItemProps) {
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  return (
    <li className="flex flex-col bg-neutral-50 dark:bg-neutral-800/50 rounded-md text-sm">
      <div className="flex items-center gap-2 p-2">
        {_getStatusIcon(step.status)}
        <button
          type="button"
          onClick={() => onNavigateToTile?.(step.coords)}
          className="flex items-center gap-1 text-primary hover:underline truncate"
        >
          <span className="truncate">{step.title}</span>
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </button>
        {step.prompt && (
          <button
            type="button"
            onClick={() => setIsPromptExpanded(!isPromptExpanded)}
            className="ml-auto p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            title={isPromptExpanded ? 'Hide prompt' : 'Show prompt'}
          >
            {isPromptExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
      {isPromptExpanded && step.prompt && (
        <div className="px-2 pb-2">
          <pre className="max-h-[150px] overflow-y-auto p-2 bg-neutral-100 dark:bg-neutral-900 rounded text-xs font-mono text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words">
            {step.prompt}
          </pre>
        </div>
      )}
    </li>
  );
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
      <ul className="flex flex-col gap-1 max-h-[250px] overflow-y-auto">
        {steps.map((step, index) => (
          <StepItem
            key={`${step.coords}-${index}`}
            step={step}
            onNavigateToTile={onNavigateToTile}
          />
        ))}
      </ul>
    </div>
  );
}
