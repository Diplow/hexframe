import '~/test/setup'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

/**
 * Unit tests for useRun hook
 *
 * This hook manages SYSTEM tile execution via the agentic.run tRPC mutation.
 * It handles:
 * - Single step execution per call (external orchestration)
 * - Status tracking (idle, running, blocked, complete, error)
 * - Callbacks for step completion, run completion, blocked state, and errors
 *
 * Test categories:
 * 1. Hook initialization and return values
 * 2. Run function behavior
 * 3. Completion handling
 * 4. Blocked state handling
 * 5. Error handling
 */

// =============================================================================
// Mock tRPC
// =============================================================================

const mockMutateAsync = vi.fn()
const mockMutate = vi.fn()

vi.mock('~/commons/trpc/react', () => ({
  api: {
    agentic: {
      run: {
        useMutation: vi.fn(() => ({
          mutateAsync: mockMutateAsync,
          mutate: mockMutate,
          isPending: false,
          isError: false,
          error: null,
        })),
      },
    },
  },
}))

// Import AFTER mock setup
import { useRun } from '~/app/map/_hooks/use-run'

describe('useRun', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutateAsync.mockReset()
  })

  // ===========================================================================
  // 1. Hook Initialization and Return Values
  // ===========================================================================
  describe('Hook Initialization', () => {
    it('should return initial state with runStatus idle', () => {
      const { result } = renderHook(() => useRun())

      expect(result.current.runStatus).toBe('idle')
      expect(result.current.currentStep).toBeNull()
      expect(result.current.blockageReason).toBeNull()
      expect(result.current.isRunning).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.run).toBe('function')
    })

    it('should accept optional callbacks', () => {
      const callbacks = {
        onStepComplete: vi.fn(),
        onRunComplete: vi.fn(),
        onBlocked: vi.fn(),
        onError: vi.fn(),
      }

      const { result } = renderHook(() => useRun(callbacks))

      expect(result.current.runStatus).toBe('idle')
    })
  })

  // ===========================================================================
  // 2. Run Function Behavior
  // ===========================================================================
  describe('run function', () => {
    it('should call agentic.run with coords', async () => {
      mockMutateAsync.mockResolvedValueOnce({
        runId: 'run_123',
        runStatus: 'open',
        stepExecuted: 'userId,0:1,1',
        stepResult: 'completed',
        blockageReason: null,
        response: 'Step completed',
        isComplete: false,
      })

      const { result } = renderHook(() => useRun())

      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(mockMutateAsync).toHaveBeenCalledWith({
        coords: 'userId,0:1',
        instruction: undefined,
      })
    })

    it('should call agentic.run with coords and instruction', async () => {
      mockMutateAsync.mockResolvedValueOnce({
        runId: 'run_123',
        runStatus: 'open',
        stepExecuted: 'userId,0:1,1',
        stepResult: 'completed',
        blockageReason: null,
        response: 'Step completed',
        isComplete: false,
      })

      const { result } = renderHook(() => useRun())

      await act(async () => {
        await result.current.run('userId,0:1', 'Focus on error handling')
      })

      expect(mockMutateAsync).toHaveBeenCalledWith({
        coords: 'userId,0:1',
        instruction: 'Focus on error handling',
      })
    })

    it('should update runStatus to running during execution', async () => {
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockMutateAsync.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useRun())

      act(() => {
        void result.current.run('userId,0:1')
      })

      await waitFor(() => {
        expect(result.current.runStatus).toBe('running')
        expect(result.current.isRunning).toBe(true)
      })

      // Resolve the promise to cleanup
      await act(async () => {
        resolvePromise!({
          runId: 'run_123',
          runStatus: 'open',
          stepExecuted: 'userId,0:1,1',
          stepResult: 'completed',
          blockageReason: null,
          response: 'Done',
          isComplete: true,
        })
      })
    })

    it('should update currentStep from response', async () => {
      mockMutateAsync.mockResolvedValueOnce({
        runId: 'run_123',
        runStatus: 'open',
        stepExecuted: 'userId,0:1,2',
        stepResult: 'completed',
        blockageReason: null,
        response: 'Step completed',
        isComplete: false,
      })

      const { result } = renderHook(() => useRun())

      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(result.current.currentStep).toBe('userId,0:1,2')
    })

    it('should call onStepComplete callback', async () => {
      const onStepComplete = vi.fn()
      mockMutateAsync.mockResolvedValueOnce({
        runId: 'run_123',
        runStatus: 'open',
        stepExecuted: 'userId,0:1,2',
        stepResult: 'completed',
        blockageReason: null,
        response: 'Step completed',
        isComplete: false,
      })

      const { result } = renderHook(() => useRun({ onStepComplete }))

      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(onStepComplete).toHaveBeenCalledWith('userId,0:1,2')
    })
  })

  // ===========================================================================
  // 3. Completion Handling
  // ===========================================================================
  describe('completion', () => {
    it('should set runStatus to complete when isComplete is true', async () => {
      mockMutateAsync.mockResolvedValueOnce({
        runId: 'run_123',
        runStatus: 'closed',
        stepExecuted: null,
        stepResult: null,
        blockageReason: null,
        response: null,
        isComplete: true,
      })

      const { result } = renderHook(() => useRun())

      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(result.current.runStatus).toBe('complete')
      expect(result.current.isRunning).toBe(false)
    })

    it('should call onRunComplete callback when complete', async () => {
      const onRunComplete = vi.fn()
      mockMutateAsync.mockResolvedValueOnce({
        runId: 'run_123',
        runStatus: 'closed',
        stepExecuted: null,
        stepResult: null,
        blockageReason: null,
        response: null,
        isComplete: true,
      })

      const { result } = renderHook(() => useRun({ onRunComplete }))

      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(onRunComplete).toHaveBeenCalled()
    })

    it('should return to idle status after step completes without isComplete', async () => {
      mockMutateAsync.mockResolvedValueOnce({
        runId: 'run_123',
        runStatus: 'open',
        stepExecuted: 'userId,0:1,1',
        stepResult: 'completed',
        blockageReason: null,
        response: 'Done',
        isComplete: false,
      })

      const { result } = renderHook(() => useRun())

      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(result.current.runStatus).toBe('idle')
      expect(result.current.isRunning).toBe(false)
    })
  })

  // ===========================================================================
  // 4. Blocked State Handling
  // ===========================================================================
  describe('blocked handling', () => {
    it('should set runStatus to blocked when stepResult is blocked', async () => {
      mockMutateAsync.mockResolvedValueOnce({
        runId: 'run_123',
        runStatus: 'blocked',
        stepExecuted: 'userId,0:1,1',
        stepResult: 'blocked',
        blockageReason: 'Missing API key',
        response: 'Could not proceed',
        isComplete: false,
      })

      const { result } = renderHook(() => useRun())

      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(result.current.runStatus).toBe('blocked')
    })

    it('should store blockageReason from response', async () => {
      mockMutateAsync.mockResolvedValueOnce({
        runId: 'run_123',
        runStatus: 'blocked',
        stepExecuted: 'userId,0:1,1',
        stepResult: 'blocked',
        blockageReason: 'Missing API key',
        response: 'Could not proceed',
        isComplete: false,
      })

      const { result } = renderHook(() => useRun())

      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(result.current.blockageReason).toBe('Missing API key')
    })

    it('should call onBlocked callback with reason', async () => {
      const onBlocked = vi.fn()
      mockMutateAsync.mockResolvedValueOnce({
        runId: 'run_123',
        runStatus: 'blocked',
        stepExecuted: 'userId,0:1,1',
        stepResult: 'blocked',
        blockageReason: 'Missing API key',
        response: 'Could not proceed',
        isComplete: false,
      })

      const { result } = renderHook(() => useRun({ onBlocked }))

      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(onBlocked).toHaveBeenCalledWith('Missing API key')
    })
  })

  // ===========================================================================
  // 5. Error Handling
  // ===========================================================================
  describe('error handling', () => {
    it('should set runStatus to error on tRPC error', async () => {
      const error = new Error('Network error')
      mockMutateAsync.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useRun())

      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(result.current.runStatus).toBe('error')
      expect(result.current.isRunning).toBe(false)
    })

    it('should store error object', async () => {
      const error = new Error('Network error')
      mockMutateAsync.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useRun())

      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(result.current.error).toBe(error)
    })

    it('should call onError callback', async () => {
      const onError = vi.fn()
      const error = new Error('Network error')
      mockMutateAsync.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useRun({ onError }))

      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(onError).toHaveBeenCalledWith(error)
    })

    it('should handle validation error from server', async () => {
      const error = new Error('Only SYSTEM tiles or custom types can be run')
      mockMutateAsync.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useRun())

      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(result.current.runStatus).toBe('error')
      expect(result.current.error?.message).toBe('Only SYSTEM tiles or custom types can be run')
    })
  })

  // ===========================================================================
  // 6. Reset Functionality
  // ===========================================================================
  describe('reset functionality', () => {
    it('should clear error and blockage state on new run', async () => {
      const error = new Error('Network error')
      mockMutateAsync.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useRun())

      // First run fails
      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(result.current.error).toBe(error)
      expect(result.current.runStatus).toBe('error')

      // Reset mock for second call
      mockMutateAsync.mockResolvedValueOnce({
        runId: 'run_123',
        runStatus: 'open',
        stepExecuted: 'userId,0:1,1',
        stepResult: 'completed',
        blockageReason: null,
        response: 'Done',
        isComplete: false,
      })

      // Second run succeeds - should clear error
      await act(async () => {
        await result.current.run('userId,0:1')
      })

      expect(result.current.error).toBeNull()
      expect(result.current.runStatus).toBe('idle')
    })
  })
})
