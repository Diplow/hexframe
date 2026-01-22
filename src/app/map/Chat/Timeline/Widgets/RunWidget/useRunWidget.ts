'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRun } from '~/app/map/_hooks/use-run';
import { api } from '~/commons/trpc/react';
import type { ExecutedStep, ToolCallDisplay } from '~/app/map/Chat/Timeline/Widgets/RunWidget/_subsystems/StepsList';

// Re-export types for backward compatibility
export type { ExecutedStep, ToolCallDisplay };

export type RunWidgetStatus = 'idle' | 'running' | 'blocked' | 'complete' | 'error';

interface UseRunWidgetOptions {
  tileCoords: string;
  tileTitle: string;
  onClose?: () => void;
  onNavigateToTile?: (coords: string) => void;
}

interface HexplanData {
  runId: string;
  coords: string;
  content: string;
}

interface UseRunWidgetReturn {
  status: RunWidgetStatus;
  instruction: string;
  currentStep: string | null;
  currentPrompt: string | null;
  executedSteps: ExecutedStep[];
  blockageReason: string | null;
  error: Error | null;
  startedAt: Date | null;
  elapsedTime: number;
  currentStepHexplan: HexplanData | null;
  parentHexplan: HexplanData | null;
  setInstruction: (value: string) => void;
  startRun: () => Promise<void>;
  resumeRun: () => Promise<void>;
  resumeWithInput: (input: string) => Promise<void>;
  stopRun: () => void;
}

export function useRunWidget(options: UseRunWidgetOptions): UseRunWidgetReturn {
  const { tileCoords } = options;

  const [status, setStatus] = useState<RunWidgetStatus>('idle');
  const [instruction, setInstruction] = useState('');
  const [executedSteps, setExecutedSteps] = useState<ExecutedStep[]>([]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentStepHexplan, setCurrentStepHexplan] = useState<HexplanData | null>(null);
  const [parentHexplan, setParentHexplan] = useState<HexplanData | null>(null);

  const instructionRef = useRef(instruction);
  const shouldContinueRef = useRef(false);
  const lastPromptRef = useRef<string | null>(null);
  const lastResponseRef = useRef<string | null>(null);
  const lastHexplanRef = useRef<string | null>(null);

  // Fetch existing run state on mount
  const { data: runState, refetch: refetchRunState } = api.agentic.getRunState.useQuery(
    { coords: tileCoords },
    { refetchOnWindowFocus: false }
  );

  // Initialize widget state from existing run
  useEffect(() => {
    if (runState && !isInitialized) {
      // Map executionLog to executedSteps
      const steps = runState.executionLog.map(entry => ({
        coords: entry.stepCoords,
        title: entry.stepTitle ?? entry.stepCoords,
        status: entry.status,
        timestamp: new Date(entry.startedAt),
        prompt: entry.hexecutePrompt,
        agentResponse: entry.agentResponse,
        hexplanContent: entry.hexplanContent,
        toolCalls: entry.toolCalls,
      }));
      setExecutedSteps(steps);

      // Set widget status from run status
      if (runState.status === 'blocked') {
        setStatus('blocked');
        // Pre-load the next step's prompt for immediate display
        if (runState.nextStep) {
          setCurrentPrompt(runState.nextStep.prompt);
          lastPromptRef.current = runState.nextStep.prompt;
        }
        // Load hexplan data for blocked state editing
        if (runState.currentStepHexplan) {
          setCurrentStepHexplan({
            runId: runState.runId,
            coords: runState.currentStepHexplan.coords,
            content: runState.currentStepHexplan.content,
          });
        }
        if (runState.parentHexplan) {
          setParentHexplan({
            runId: runState.runId,
            coords: runState.parentHexplan.coords,
            content: runState.parentHexplan.content,
          });
        }
      } else if (runState.status === 'closed') {
        setStatus('complete');
      } else if (runState.status === 'open' && steps.length > 0) {
        // Has steps but still open - was likely interrupted
        setStatus('idle');
      }

      setIsInitialized(true);
    }
  }, [runState, isInitialized]);

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
    onStepStart: (stepCoords, stepTitle, prompt) => {
      setCurrentPrompt(prompt);
      lastPromptRef.current = prompt;
    },
    onStepComplete: (stepCoords, stepTitle, response, hexplanContent) => {
      lastResponseRef.current = response ?? null;
      lastHexplanRef.current = hexplanContent ?? null;
      setExecutedSteps((previous) => [
        ...previous,
        {
          coords: stepCoords,
          title: stepTitle,
          status: 'completed',
          timestamp: new Date(),
          prompt: lastPromptRef.current ?? undefined,
          agentResponse: response,
          hexplanContent: hexplanContent,
        },
      ]);
    },
    onRunComplete: () => {
      setStatus('complete');
      shouldContinueRef.current = false;
      // Refetch to get final state
      void refetchRunState();
    },
    onBlocked: (_reason, stepCoords, stepTitle, prompt, response, hexplanContent, stepRunId) => {
      setStatus('blocked');
      shouldContinueRef.current = false;
      setCurrentPrompt(prompt);
      lastPromptRef.current = prompt;
      lastResponseRef.current = response ?? null;
      lastHexplanRef.current = hexplanContent ?? null;
      // Update hexplan state for editing (runId comes from callback or fallback to runState)
      const resolvedRunId = stepRunId ?? runState?.runId ?? '';
      if (hexplanContent && resolvedRunId) {
        setCurrentStepHexplan({
          runId: resolvedRunId,
          coords: stepCoords,  // Use the step coords directly (hexplan is stored per coords in run_hexplans)
          content: hexplanContent
        });
      }
      setExecutedSteps((previous) => [
        ...previous,
        {
          coords: stepCoords,
          title: stepTitle,
          status: 'blocked',
          timestamp: new Date(),
          prompt: prompt || undefined,
          agentResponse: response,
          hexplanContent: hexplanContent,
        },
      ]);
      // Refetch to get parent hexplan and updated state
      void refetchRunState();
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

    // Show pre-computed prompt immediately (if available from getRunState)
    if (runState?.nextStep) {
      setCurrentPrompt(runState.nextStep.prompt);
      lastPromptRef.current = runState.nextStep.prompt;
    }

    await executeLoop();
  }, [executeLoop, runState]);

  const resumeRun = useCallback(async () => {
    setStatus('running');
    shouldContinueRef.current = true;

    // Show pre-computed prompt immediately (if available from getRunState)
    if (runState?.nextStep) {
      setCurrentPrompt(runState.nextStep.prompt);
      lastPromptRef.current = runState.nextStep.prompt;
    }

    await executeLoop();
  }, [executeLoop, runState]);

  const resumeWithInput = useCallback(async (input: string) => {
    // Store the user input as the instruction for the next run
    // This will be passed to the run mutation - backend will format as User Feedback
    if (input.trim()) {
      setInstruction(input.trim());
      instructionRef.current = input.trim();
    }

    // Resume execution
    await resumeRun();
  }, [resumeRun]);

  const stopRun = useCallback(() => {
    shouldContinueRef.current = false;
    setStatus('idle');
  }, []);

  return {
    status,
    instruction,
    currentStep,
    currentPrompt,
    executedSteps,
    blockageReason,
    error,
    startedAt,
    elapsedTime,
    currentStepHexplan,
    parentHexplan,
    setInstruction,
    startRun,
    resumeRun,
    resumeWithInput,
    stopRun,
  };
}
