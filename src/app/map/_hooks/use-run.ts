import { useState, useCallback } from 'react'
import { api } from '~/commons/trpc/react'

/**
 * Options for configuring the useRun hook callbacks
 */
interface UseRunOptions {
  /** Called when a step starts executing with its prompt */
  onStepStart?: (stepCoords: string, prompt: string) => void
  /** Called when a step completes successfully */
  onStepComplete?: (stepCoords: string) => void
  /** Called when the entire run completes */
  onRunComplete?: () => void
  /** Called when execution is blocked */
  onBlocked?: (reason: string, prompt: string) => void
  /** Called when an error occurs */
  onError?: (error: Error) => void
}

type RunStatus = 'idle' | 'running' | 'blocked' | 'complete' | 'error'

/**
 * Return type for the useRun hook
 */
interface UseRunReturn {
  /** Execute a single step of the run */
  run: (coords: string, instruction?: string) => Promise<void>
  /** Current run status */
  runStatus: RunStatus
  /** Currently executing step coordinates */
  currentStep: string | null
  /** Reason for blockage (if blocked) */
  blockageReason: string | null
  /** Whether a run is in progress */
  isRunning: boolean
  /** Error that occurred during execution */
  error: Error | null
  /** The hexecute prompt used for the last executed step */
  lastPrompt: string | null
}

/**
 * Hook for managing SYSTEM tile execution via the agentic.run tRPC mutation.
 *
 * Each call to `run()` executes ONE step and returns. The caller controls
 * the execution loop, allowing for UI updates between steps.
 *
 * @example
 * ```typescript
 * const { run, runStatus, currentStep, blockageReason } = useRun({
 *   onStepComplete: (step) => console.log('Completed:', step),
 *   onRunComplete: () => toast.success('Run finished!'),
 *   onBlocked: (reason) => toast.error(`Blocked: ${reason}`)
 * })
 *
 * // Trigger execution
 * await run('userId,0:6')
 *
 * // Check status
 * if (runStatus === 'blocked') {
 *   // Show blockage UI
 * }
 * ```
 */
export function useRun(options?: UseRunOptions): UseRunReturn {
  const [runStatus, setRunStatus] = useState<RunStatus>('idle')
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [blockageReason, setBlockageReason] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [lastPrompt, setLastPrompt] = useState<string | null>(null)

  const runMutation = api.agentic.run.useMutation()

  const run = useCallback(
    async (coords: string, instruction?: string) => {
      // Reset state before new run
      setError(null)
      setBlockageReason(null)
      setRunStatus('running')

      try {
        const result = await runMutation.mutateAsync({
          coords,
          instruction,
        })

        // Update current step and prompt
        setCurrentStep(result.stepExecuted)
        setLastPrompt(result.hexecutePrompt ?? null)

        // Notify step started with prompt
        if (result.stepExecuted && result.hexecutePrompt) {
          options?.onStepStart?.(result.stepExecuted, result.hexecutePrompt)
        }

        // Handle completion
        if (result.isComplete) {
          setRunStatus('complete')
          options?.onRunComplete?.()
          return
        }

        // Handle blocked state
        if (result.stepResult === 'blocked') {
          setRunStatus('blocked')
          setBlockageReason(result.blockageReason)
          options?.onBlocked?.(result.blockageReason ?? 'Unknown blockage', result.hexecutePrompt ?? '')
          return
        }

        // Step completed successfully
        if (result.stepExecuted) {
          options?.onStepComplete?.(result.stepExecuted)
        }

        // Return to idle - caller decides whether to continue
        setRunStatus('idle')
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Unknown error')
        setError(errorObj)
        setRunStatus('error')
        options?.onError?.(errorObj)
      }
    },
    [runMutation, options]
  )

  return {
    run,
    runStatus,
    currentStep,
    blockageReason,
    isRunning: runStatus === 'running',
    error,
    lastPrompt,
  }
}
