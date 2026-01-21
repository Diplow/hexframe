'use client';

import type { ExecutedStep } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_subsystems/StepsList/types';
import { StepItem } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_subsystems/StepsList/_components/StepItem';

interface StepsListProps {
  steps: ExecutedStep[];
  onNavigateToTile?: (coords: string) => void;
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

// Re-export types for convenience
export type { ExecutedStep, ToolCallDisplay, ExpandedSection } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_subsystems/StepsList/types';
