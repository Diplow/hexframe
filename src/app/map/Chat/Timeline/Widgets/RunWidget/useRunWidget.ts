'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRun } from '~/app/map/_hooks/use-run';

export interface ExecutedStep {
  coords: string;
  title: string;
  status: 'completed' | 'blocked' | 'error';
  timestamp: Date;
}

export type RunWidgetStatus = 'idle' | 'running' | 'blocked' | 'complete' | 'error';

interface UseRunWidgetOptions {
  tileCoords: string;
  tileTitle: string;
  onClose?: () => void;
  onNavigateToTile?: (coords: string) => void;
}

interface UseRunWidgetReturn {
  status: RunWidgetStatus;
  instruction: string;
  currentStep: string | null;
  executedSteps: ExecutedStep[];
  blockageReason: string | null;
  error: Error | null;
  startedAt: Date | null;
  elapsedTime: number;
  setInstruction: (value: string) => void;
  startRun: () => Promise<void>;
  resumeRun: () => Promise<void>;
  stopRun: () => void;
}

export function useRunWidget(options: UseRunWidgetOptions): UseRunWidgetReturn {
  const { tileCoords } = options;

  const [status, setStatus] = useState<RunWidgetStatus>('idle');
  const [instruction, setInstruction] = useState('');
  const [executedSteps, setExecutedSteps] = useState<ExecutedStep[]>([]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const instructionRef = useRef(instruction);
  const shouldContinueRef = useRef(false);

  // Keep instruction ref in sync
  useEffect(() => {
    instructionRef.current = instruction;
  }, [instruction]);

  // Elapsed time tracking
  useEffect(() => {
    if (status !== 'running' || !startedAt) {
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [status, startedAt]);

  const {
    run,
    currentStep,
    blockageReason,
    error,
  } = useRun({
    onStepComplete: (stepCoords) => {
      setExecutedSteps((previous) => [
        ...previous,
        {
          coords: stepCoords,
          title: stepCoords,
          status: 'completed',
          timestamp: new Date(),
        },
      ]);
    },
    onRunComplete: () => {
      setStatus('complete');
      shouldContinueRef.current = false;
    },
    onBlocked: (_reason) => {
      setStatus('blocked');
      shouldContinueRef.current = false;
      const lastStepCoords = currentStep ?? tileCoords;
      setExecutedSteps((previous) => [
        ...previous,
        {
          coords: lastStepCoords,
          title: lastStepCoords,
          status: 'blocked',
          timestamp: new Date(),
        },
      ]);
    },
    onError: (_errorInstance) => {
      setStatus('error');
      shouldContinueRef.current = false;
    },
  });

  const executeLoop = useCallback(async () => {
    while (shouldContinueRef.current) {
      await run(tileCoords, instructionRef.current || undefined);

      // Check if we should continue after the run completes
      // The status is updated via callbacks, so check the ref
      if (!shouldContinueRef.current) {
        break;
      }

      // If run returned to idle, we can continue with next step
      // If blocked, complete, or error, the loop will exit via shouldContinueRef
    }
  }, [run, tileCoords]);

  const startRun = useCallback(async () => {
    setStatus('running');
    setStartedAt(new Date());
    setElapsedTime(0);
    setExecutedSteps([]);
    shouldContinueRef.current = true;

    await executeLoop();
  }, [executeLoop]);

  const resumeRun = useCallback(async () => {
    setStatus('running');
    shouldContinueRef.current = true;

    await executeLoop();
  }, [executeLoop]);

  const stopRun = useCallback(() => {
    shouldContinueRef.current = false;
    setStatus('idle');
  }, []);

  return {
    status,
    instruction,
    currentStep,
    executedSteps,
    blockageReason,
    error,
    startedAt,
    elapsedTime,
    setInstruction,
    startRun,
    resumeRun,
    stopRun,
  };
}
