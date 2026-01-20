'use client';

import { Play, AlertCircle } from 'lucide-react';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';
import { useRunWidget } from '~/app/map/Chat/Timeline/Widgets/RunWidget/useRunWidget';
import { PreRunState } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_components/PreRunState';
import { RunningState } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_components/RunningState';
import { BlockedState } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_components/BlockedState';
import { CompletedState } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_components/CompletedState';
import { StepsList } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_components/StepsList';
import { useMapCacheNavigation } from '~/app/map/Cache';

interface RunWidgetProps {
  tileCoords: string;
  tileTitle: string;
  onClose?: () => void;
}

function _formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function RunWidget({ tileCoords, tileTitle, onClose }: RunWidgetProps) {
  const { navigateToItem } = useMapCacheNavigation();

  const {
    status,
    instruction,
    currentStep,
    executedSteps,
    blockageReason,
    error,
    elapsedTime,
    setInstruction,
    startRun,
    resumeRun,
    stopRun,
  } = useRunWidget({
    tileCoords,
    tileTitle,
    onClose,
    onNavigateToTile: (coords) => void navigateToItem(coords),
  });

  const handleNavigateToTile = (coords: string) => {
    void navigateToItem(coords);
  };

  const subtitle =
    status === 'running' || status === 'blocked' || status === 'complete'
      ? _formatElapsedTime(elapsedTime)
      : undefined;

  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<Play className="h-5 w-5 text-primary" />}
        title={tileTitle}
        subtitle={subtitle}
        onClose={onClose}
      />

      <WidgetContent>
        {status === 'idle' && (
          <PreRunState
            instruction={instruction}
            onInstructionChange={setInstruction}
            onStartRun={() => void startRun()}
          />
        )}

        {status === 'running' && (
          <>
            <RunningState
              currentStep={currentStep}
              onNavigateToTile={handleNavigateToTile}
              onStopRun={stopRun}
            />
            {executedSteps.length > 0 && (
              <StepsList
                steps={executedSteps}
                onNavigateToTile={handleNavigateToTile}
              />
            )}
          </>
        )}

        {status === 'blocked' && (
          <>
            <BlockedState
              blockageReason={blockageReason}
              onResumeRun={() => void resumeRun()}
            />
            {executedSteps.length > 0 && (
              <StepsList
                steps={executedSteps}
                onNavigateToTile={handleNavigateToTile}
              />
            )}
          </>
        )}

        {status === 'complete' && (
          <CompletedState
            executedSteps={executedSteps}
            elapsedTime={elapsedTime}
            onNavigateToTile={handleNavigateToTile}
          />
        )}

        {status === 'error' && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-destructive">
                Error
              </span>
              {error && (
                <span className="text-sm text-destructive/80">
                  {error.message}
                </span>
              )}
            </div>
          </div>
        )}
      </WidgetContent>
    </BaseWidget>
  );
}
