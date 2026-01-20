'use client';

import { Loader2, Square, ExternalLink } from 'lucide-react';
import { PromptDisplay } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_components/PromptDisplay';

interface RunningStateProps {
  currentStep: string | null;
  currentPrompt?: string | null;
  onNavigateToTile?: (coords: string) => void;
  onStopRun: () => void;
}

export function RunningState({
  currentStep,
  currentPrompt,
  onNavigateToTile,
  onStopRun,
}: RunningStateProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-md">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-neutral-700 dark:text-neutral-300">
          Running...
        </span>
      </div>

      {currentStep && (
        <div className="flex items-center gap-2 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-md">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Current step:
          </span>
          <button
            type="button"
            onClick={() => onNavigateToTile?.(currentStep)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {currentStep}
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      )}

      {currentPrompt && <PromptDisplay prompt={currentPrompt} />}

      <button
        type="button"
        onClick={onStopRun}
        className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-md transition-colors"
      >
        <Square className="h-4 w-4" />
        Stop
      </button>
    </div>
  );
}
