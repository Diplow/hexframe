import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, render } from '@testing-library/react'
import { TileActionsProvider, useTileActions } from './TileActionsContext'
import type { ReactNode } from 'react'
import React from 'react'
import { createMockTileData } from '../test-utils/mockTileData'

describe('TileActionsContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear()
    // Setup fake timers for tests that need them
    vi.useFakeTimers()
  })

  afterEach(() => {
    // Restore real timers
    vi.useRealTimers()
  })

  describe('Context Provider', () => {
    it('provides context with required handlers', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <TileActionsProvider>{children}</TileActionsProvider>
      )

      const { result } = renderHook(() => useTileActions(), { wrapper })

      expect(typeof result.current.onTileClick).toBe('function')
      expect(typeof result.current.onTileDoubleClick).toBe('function')
      expect(typeof result.current.onTileRightClick).toBe('function')
      expect(typeof result.current.onTileHover).toBe('function')
      expect(typeof result.current.onTileDragStart).toBe('function')
      expect(typeof result.current.onTileDrop).toBe('function')
      expect(result.current.isDragging).toBe(false)
    })

    it('propagates context updates to multiple consumers', () => {
      const results: ReturnType<typeof useTileActions>[] = []

      const Consumer1 = () => {
        results[0] = useTileActions()
        return <div>Consumer1: {results[0]?.isDragging ? 'dragging' : 'not dragging'}</div>
      }

      const Consumer2 = () => {
        results[1] = useTileActions()
        return <div>Consumer2: {results[1]?.isDragging ? 'dragging' : 'not dragging'}</div>
      }

      const TestComponent = () => (
        <TileActionsProvider>
          <Consumer1 />
          <Consumer2 />
        </TileActionsProvider>
      )

      render(<TestComponent />)

      // Both should have same initial state
      expect(results[0]?.isDragging).toBe(false)
      expect(results[1]?.isDragging).toBe(false)

      // Start dragging
      const tileData = createMockTileData()
      act(() => {
        results[0]?.onTileDragStart(tileData)
      })

      // Both should reflect the update
      expect(results[0]?.isDragging).toBe(true)
      expect(results[1]?.isDragging).toBe(true)
    })
  })

  describe('Click Handlers', () => {
    it('calls appropriate handler based on click type', () => {
      const mockHandlers = {
        onSelectClick: vi.fn(),
        onNavigateClick: vi.fn(),
        onExpandClick: vi.fn(),
        onCreateClick: vi.fn(),
        onEditClick: vi.fn(),
        onDeleteClick: vi.fn(),
      }

      const wrapper = ({ children }: { children: ReactNode }) => (
        <TileActionsProvider {...mockHandlers}>{children}</TileActionsProvider>
      )

      const { result } = renderHook(() => useTileActions(), { wrapper })

      const tileData = createMockTileData()
      const preventDefault = vi.fn()
      const mockEvent = { 
        clientX: 100, 
        clientY: 200,
        ctrlKey: false,
        metaKey: false,
        preventDefault
      } as unknown as React.MouseEvent

      // Test regular click for select (after timeout)
      act(() => {
        result.current.onTileClick(tileData, mockEvent)
      })
      
      // Wait for timeout
      act(() => {
        vi.runAllTimers()
      })
      
      expect(mockHandlers.onSelectClick).toHaveBeenCalledWith(tileData)

      // Test Ctrl+click for navigate
      const ctrlClickEvent = { ...mockEvent, ctrlKey: true }
      act(() => {
        result.current.onTileClick(tileData, ctrlClickEvent)
      })
      
      act(() => {
        vi.runAllTimers()
      })
      
      expect(mockHandlers.onNavigateClick).toHaveBeenCalledWith(tileData)

      // Test double-click for expand
      act(() => {
        result.current.onTileDoubleClick(tileData)
      })
      expect(mockHandlers.onExpandClick).toHaveBeenCalledWith(tileData)

      // Test right-click opens context menu
      act(() => {
        result.current.onTileRightClick(tileData, mockEvent)
      })
      expect(preventDefault).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('context value includes all necessary properties', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <TileActionsProvider>{children}</TileActionsProvider>
      )

      const { result } = renderHook(() => useTileActions(), { wrapper })

      // Verify all properties are included in context value
      expect(result.current).toHaveProperty('onTileClick')
      expect(result.current).toHaveProperty('onTileDoubleClick')
      expect(result.current).toHaveProperty('onTileRightClick')
      expect(result.current).toHaveProperty('onTileHover')
      expect(result.current).toHaveProperty('onTileDragStart')
      expect(result.current).toHaveProperty('onTileDrop')
      expect(result.current).toHaveProperty('isDragging')
    })
  })
})