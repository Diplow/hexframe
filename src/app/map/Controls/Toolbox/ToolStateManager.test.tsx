import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ToolStateManager } from './ToolStateManager'
import { TileActionsContext, type ToolType } from '../../Canvas/TileActionsContext'
import { useAuth } from '~/contexts/AuthContext'
import type { ReactNode } from 'react'

// Mock the useAuth hook
vi.mock('~/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// Mock context provider
const mockSetDisabledTools = vi.fn()

function TestWrapper({ 
  children,
  disabledTools = new Set<ToolType>()
}: { 
  children: ReactNode
  disabledTools?: Set<ToolType>
}) {
  return (
    <TileActionsContext.Provider
      value={{
        activeTool: 'navigate',
        setActiveTool: vi.fn(),
        disabledTools,
        setDisabledTools: mockSetDisabledTools,
        onTileClick: vi.fn(),
        onTileHover: vi.fn(),
        onTileDragStart: vi.fn(),
        onTileDrop: vi.fn(),
        isDragging: false,
      }}
    >
      {children}
    </TileActionsContext.Provider>
  )
}

describe('ToolStateManager', () => {
  beforeEach(() => {
    mockSetDisabledTools.mockClear()
    vi.clearAllMocks()
  })

  it('disables create, edit, delete, and drag tools when user does not own the space', () => {
    // Mock user ID 123
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      mappingUserId: 123,
      isLoading: false,
      setMappingUserId: vi.fn(),
    })

    // Render with a coordinate in a different user's space (user 456)
    render(
      <TestWrapper>
        <ToolStateManager mapCenterCoordId="456-1:1">
          <div>test</div>
        </ToolStateManager>
      </TestWrapper>
    )

    // Should disable the create, edit, delete, and drag tools
    expect(mockSetDisabledTools).toHaveBeenCalledWith(
      new Set(['create', 'edit', 'delete', 'drag'])
    )
  })

  it('enables all tools when user owns the space', () => {
    // Mock user ID 123
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      mappingUserId: 123,
      isLoading: false,
      setMappingUserId: vi.fn(),
    })

    // Render with a coordinate in the user's own space
    render(
      <TestWrapper>
        <ToolStateManager mapCenterCoordId="123-1:1">
          <div>test</div>
        </ToolStateManager>
      </TestWrapper>
    )

    // Should not disable any tools
    expect(mockSetDisabledTools).toHaveBeenCalledWith(
      new Set()
    )
  })

  it('disables create, edit, delete, and drag tools when user is not authenticated', () => {
    // Mock no user (undefined)
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      mappingUserId: undefined,
      isLoading: false,
      setMappingUserId: vi.fn(),
    })

    // Render with any coordinate
    render(
      <TestWrapper>
        <ToolStateManager mapCenterCoordId="123-1:1">
          <div>test</div>
        </ToolStateManager>
      </TestWrapper>
    )

    // Should disable the create, edit, delete, and drag tools
    expect(mockSetDisabledTools).toHaveBeenCalledWith(
      new Set(['create', 'edit', 'delete', 'drag'])
    )
  })

  it('updates disabled tools when map center changes', () => {
    // Mock user ID 123
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      mappingUserId: 123,
      isLoading: false,
      setMappingUserId: vi.fn(),
    })

    const { rerender } = render(
      <TestWrapper>
        <ToolStateManager mapCenterCoordId="123-1:1">
          <div>test</div>
        </ToolStateManager>
      </TestWrapper>
    )

    // Initially, no tools should be disabled (user owns space)
    expect(mockSetDisabledTools).toHaveBeenCalledWith(new Set())

    // Clear the mock
    mockSetDisabledTools.mockClear()

    // Re-render with a different user's space
    rerender(
      <TestWrapper>
        <ToolStateManager mapCenterCoordId="456-1:1">
          <div>test</div>
        </ToolStateManager>
      </TestWrapper>
    )

    // Now create, edit, delete, and drag tools should be disabled
    expect(mockSetDisabledTools).toHaveBeenCalledWith(
      new Set(['create', 'edit', 'delete', 'drag'])
    )
  })

  it('updates disabled tools when user authentication changes', () => {
    // Start with user ID 123
    const mockUseAuth = vi.mocked(useAuth)
    mockUseAuth.mockReturnValue({
      user: null,
      mappingUserId: 123,
      isLoading: false,
      setMappingUserId: vi.fn(),
    })

    const { rerender } = render(
      <TestWrapper>
        <ToolStateManager mapCenterCoordId="123-1:1">
          <div>test</div>
        </ToolStateManager>
      </TestWrapper>
    )

    // Initially, no tools should be disabled
    expect(mockSetDisabledTools).toHaveBeenCalledWith(new Set())

    // Clear the mock
    mockSetDisabledTools.mockClear()

    // Simulate user logout
    mockUseAuth.mockReturnValue({
      user: null,
      mappingUserId: undefined,
      isLoading: false,
      setMappingUserId: vi.fn(),
    })

    rerender(
      <TestWrapper>
        <ToolStateManager mapCenterCoordId="123-1:1">
          <div>test</div>
        </ToolStateManager>
      </TestWrapper>
    )

    // Now create, edit, delete, and drag tools should be disabled
    expect(mockSetDisabledTools).toHaveBeenCalledWith(
      new Set(['create', 'edit', 'delete', 'drag'])
    )
  })
})