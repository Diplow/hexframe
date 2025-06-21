import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, render } from '@testing-library/react'
import { TileActionsProvider, useTileActions } from './TileActionsContext'
import type { ReactNode } from 'react'
import React from 'react'
import { createMockTileData } from '../test-utils/mockTileData'

describe('TileActionsContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear()
  })
  describe('Tool State Management', () => {
    it('provides tool state with default value', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <TileActionsProvider>{children}</TileActionsProvider>
      )

      const { result } = renderHook(() => useTileActions(), { wrapper })

      expect(result.current.activeTool).toBe('expand')
      expect(typeof result.current.setActiveTool).toBe('function')
    })

    it('updates tool state when setActiveTool is called', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <TileActionsProvider>{children}</TileActionsProvider>
      )

      const { result } = renderHook(() => useTileActions(), { wrapper })

      act(() => {
        result.current.setActiveTool('create')
      })

      expect(result.current.activeTool).toBe('create')

      act(() => {
        result.current.setActiveTool('edit')
      })

      expect(result.current.activeTool).toBe('edit')
    })

    it('propagates tool state updates to multiple consumers', () => {
      const results: ReturnType<typeof useTileActions>[] = []

      const Consumer1 = () => {
        results[0] = useTileActions()
        return <div>Consumer1: {results[0]?.activeTool}</div>
      }

      const Consumer2 = () => {
        results[1] = useTileActions()
        return <div>Consumer2: {results[1]?.activeTool}</div>
      }

      const TestComponent = () => (
        <TileActionsProvider>
          <Consumer1 />
          <Consumer2 />
        </TileActionsProvider>
      )

      render(<TestComponent />)

      // Both should have same initial state
      expect(results[0]?.activeTool).toBe('expand')
      expect(results[1]?.activeTool).toBe('expand')

      // Update from consumer1
      act(() => {
        results[0]?.setActiveTool('delete')
      })

      // Both should reflect the update
      expect(results[0]?.activeTool).toBe('delete')
      expect(results[1]?.activeTool).toBe('delete')
    })
  })

  describe('Tool-specific Click Handlers', () => {
    it('calls appropriate handler based on active tool', () => {
      const mockHandlers = {
        onSelectClick: vi.fn(),
        onNavigateClick: vi.fn(),
        onCreateClick: vi.fn(),
        onEditClick: vi.fn(),
        onDeleteClick: vi.fn(),
      }

      const wrapper = ({ children }: { children: ReactNode }) => (
        <TileActionsProvider {...mockHandlers}>{children}</TileActionsProvider>
      )

      const { result } = renderHook(() => useTileActions(), { wrapper })

      const tileData = createMockTileData()

      // Test select tool
      act(() => {
        result.current.setActiveTool('select')
      })
      act(() => {
        result.current.onTileClick(tileData)
      })
      expect(mockHandlers.onSelectClick).toHaveBeenCalledWith(tileData)

      // Test navigate tool
      act(() => {
        result.current.setActiveTool('navigate')
      })
      act(() => {
        result.current.onTileClick(tileData)
      })
      expect(mockHandlers.onNavigateClick).toHaveBeenCalledWith(tileData)

      // Test create tool
      act(() => {
        result.current.setActiveTool('create')
      })
      act(() => {
        result.current.onTileClick(tileData)
      })
      expect(mockHandlers.onCreateClick).toHaveBeenCalledWith(tileData)

      // Test edit tool
      act(() => {
        result.current.setActiveTool('edit')
      })
      act(() => {
        result.current.onTileClick(tileData)
      })
      expect(mockHandlers.onEditClick).toHaveBeenCalledWith(tileData)

      // Test delete tool
      act(() => {
        result.current.setActiveTool('delete')
      })
      act(() => {
        result.current.onTileClick(tileData)
      })
      expect(mockHandlers.onDeleteClick).toHaveBeenCalledWith(tileData)
    })
  })

  describe('Performance', () => {
    it('context value includes all necessary properties', () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <TileActionsProvider>{children}</TileActionsProvider>
      )

      const { result } = renderHook(() => useTileActions(), { wrapper })

      // Verify all properties are included in context value
      expect(result.current).toHaveProperty('activeTool')
      expect(result.current).toHaveProperty('setActiveTool')
      expect(result.current).toHaveProperty('onTileClick')
      expect(result.current).toHaveProperty('onTileHover')
      expect(result.current).toHaveProperty('onTileDragStart')
      expect(result.current).toHaveProperty('onTileDrop')
      expect(result.current).toHaveProperty('isDragging')
    })
  })
})