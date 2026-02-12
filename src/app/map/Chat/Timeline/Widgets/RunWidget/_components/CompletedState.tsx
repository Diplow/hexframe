'use client';

import { CheckCircle2 } from 'lucide-react';
import type { ExecutedStep } from '~/app/map/Chat/Timeline/Widgets/RunWidget/useRunWidget';
import { StepsList } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_components/StepsList';

interface CompletedStateProps {
  executedSteps: ExecutedStep[];
  elapsedTime: number;
  onNavigateToTile?: (coords: string) => void;
}

function _formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function CompletedState({
  executedSteps,
  elapsedTime,
  onNavigateToTile,
}: CompletedStateProps) {
  const completedCount = executedSteps.filter(
    (step) => step.status === 'completed'
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-md">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-success">
            Run Complete
          </span>
          <span className="text-xs text-success/80">
            {completedCount} step{completedCount !== 1 ? 's' : ''} completed in{' '}
            {_formatElapsedTime(elapsedTime)}
          </span>
        </div>
      </div>

      {executedSteps.length > 0 && (
        <StepsList steps={executedSteps} onNavigateToTile={onNavigateToTile} />
      )}
    </div>
  );
}
