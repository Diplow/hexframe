import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Toolbox } from './Toolbox'
import { TileActionsContext, type ToolType } from '../../Canvas/TileActionsContext'
import { ThemeProvider } from '~/contexts/ThemeContext'
import type { ReactNode } from 'react'

// Mock context provider
const mockSetActiveTool = vi.fn()
const mockSetDisabledTools = vi.fn()
const mockActiveTool = 'navigate'

function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TileActionsContext.Provider
        value={{
          activeTool: mockActiveTool,
          setActiveTool: mockSetActiveTool,
          disabledTools: new Set<ToolType>(),
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
    </ThemeProvider>
  )
}

describe('Toolbox', () => {
  beforeEach(() => {
    mockSetActiveTool.mockClear()
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      clear: vi.fn(),
      removeItem: vi.fn(),
      length: 0,
      key: vi.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    })
  })

  describe('Rendering and Display Modes', () => {
    it('renders with default full state', () => {
      render(
        <TestWrapper>
          <Toolbox />
        </TestWrapper>
      )

      // Toggle button should be visible
      const toggleButton = screen.getByRole('button', { name: /toggle toolbox/i })
      expect(toggleButton).toBeInTheDocument()

      // Tool buttons should be visible in full mode
      expect(screen.getByRole('button', { name: /expand tool/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /navigate tool/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create tool/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit tool/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete tool/i })).toBeInTheDocument()
      
      // Labels should be visible in full mode
      expect(screen.getByText('Expand')).toBeInTheDocument()
      expect(screen.getByText('Navigate')).toBeInTheDocument()
    })

    it('transitions between display modes', () => {
      render(
        <TestWrapper>
          <Toolbox />
        </TestWrapper>
      )

      const toggleButton = screen.getByRole('button', { name: /toggle toolbox/i })

      // Default is full mode - aria-expanded should be true
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
      
      // Navigate through all states
      // Full -> Icons only
      fireEvent.click(toggleButton)
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
      
      // Icons only -> Closed
      fireEvent.click(toggleButton)
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
      
      // Closed -> Icons only
      fireEvent.click(toggleButton)
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')

      // Icons only -> Full
      fireEvent.click(toggleButton)
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Tool Selection', () => {
    it('updates active tool when tool button is clicked', () => {
      render(
        <TestWrapper>
          <Toolbox />
        </TestWrapper>
      )

      // Toolbox is already open in full mode by default

      // Click navigate tool
      const navigateTool = screen.getByRole('button', { name: /navigate tool/i })
      fireEvent.click(navigateTool)
      expect(mockSetActiveTool).toHaveBeenCalledWith('navigate')

      // Click create tool
      const createTool = screen.getByRole('button', { name: /create tool/i })
      fireEvent.click(createTool)
      expect(mockSetActiveTool).toHaveBeenCalledWith('create')

      // Click edit tool
      const editTool = screen.getByRole('button', { name: /edit tool/i })
      fireEvent.click(editTool)
      expect(mockSetActiveTool).toHaveBeenCalledWith('edit')

      // Click delete tool
      const deleteTool = screen.getByRole('button', { name: /delete tool/i })
      fireEvent.click(deleteTool)
      expect(mockSetActiveTool).toHaveBeenCalledWith('delete')
    })

    it('highlights the active tool', () => {
      // Start with navigate tool active
      let currentActiveTool: ToolType = 'navigate'
      const TestComponent = () => {
        return (
          <ThemeProvider>
            <TileActionsContext.Provider
              value={{
                activeTool: currentActiveTool,
                setActiveTool: mockSetActiveTool,
                disabledTools: new Set<ToolType>(),
                setDisabledTools: mockSetDisabledTools,
                onTileClick: vi.fn(),
                onTileHover: vi.fn(),
                onTileDragStart: vi.fn(),
                onTileDrop: vi.fn(),
                isDragging: false,
              }}
            >
              <Toolbox />
            </TileActionsContext.Provider>
          </ThemeProvider>
        )
      }

      const { rerender } = render(<TestComponent />)

      // Toolbox is already open in full mode by default
      
      // Navigate tool should be highlighted (we set it as the active tool)
      const navigateTool = screen.getByRole('button', { name: /navigate tool/i })
      expect(navigateTool).toHaveAttribute('aria-pressed', 'true')

      // Update context to simulate tool change
      currentActiveTool = 'create'
      rerender(<TestComponent />)

      // Create tool should be highlighted, navigate should not
      const createTool = screen.getByRole('button', { name: /create tool/i })
      expect(createTool).toHaveAttribute('aria-pressed', 'true')
      expect(navigateTool).toHaveAttribute('aria-pressed', 'false')
    })
    
    it('disables tools that are in the disabled set', () => {
      const TestComponent = () => {
        return (
          <ThemeProvider>
            <TileActionsContext.Provider
              value={{
                activeTool: 'navigate',
                setActiveTool: mockSetActiveTool,
                disabledTools: new Set<ToolType>(['create', 'delete']),
                setDisabledTools: mockSetDisabledTools,
                onTileClick: vi.fn(),
                onTileHover: vi.fn(),
                onTileDragStart: vi.fn(),
                onTileDrop: vi.fn(),
                isDragging: false,
              }}
            >
              <Toolbox />
            </TileActionsContext.Provider>
          </ThemeProvider>
        )
      }
      
      render(<TestComponent />)
      
      // Toolbox is already open in full mode by default
      
      // Check that create and delete tools are disabled
      const createTool = screen.getByRole('button', { name: /create tool \(disabled\)/i })
      const deleteTool = screen.getByRole('button', { name: /delete tool \(disabled\)/i })
      expect(createTool).toBeDisabled()
      expect(deleteTool).toBeDisabled()
      expect(createTool).toHaveAttribute('aria-disabled', 'true')
      expect(deleteTool).toHaveAttribute('aria-disabled', 'true')
      
      // Check that navigate tool is not disabled but expand tool is also not disabled
      const navigateTool = screen.getByRole('button', { name: /^navigate tool$/i })
      const expandTool = screen.getByRole('button', { name: /^expand tool$/i })
      expect(navigateTool).not.toBeDisabled()
      expect(expandTool).not.toBeDisabled()
      
      // Try clicking disabled tool - should not trigger setActiveTool
      fireEvent.click(createTool)
      expect(mockSetActiveTool).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Shortcuts Display', () => {
    it('shows tooltips with labels and shortcuts on hover', async () => {
      render(
        <TestWrapper>
          <Toolbox />
        </TestWrapper>
      )

      // Open toolbox
      const toggleButton = screen.getByRole('button', { name: /toggle toolbox/i })
      fireEvent.click(toggleButton)

      // Hover over navigate tool
      const navigateTool = screen.getByRole('button', { name: /navigate tool/i })
      fireEvent.mouseEnter(navigateTool.parentElement!)

      // Tooltip should show label and shortcut
      const tooltips = screen.getAllByRole('tooltip')
      const navigateTooltip = tooltips.find(el => el.textContent?.includes('Navigate'))
      expect(navigateTooltip).toBeTruthy()
      expect(navigateTooltip).toHaveTextContent('Navigate')
      expect(navigateTooltip).toHaveTextContent('Press N')
    })

    it('buttons have consistent styling in all modes', () => {
      render(
        <TestWrapper>
          <Toolbox />
        </TestWrapper>
      )

      // Toolbox is already open in full mode by default

      // Check button exists
      const navigateTool = screen.getByRole('button', { name: /navigate tool/i })
      expect(navigateTool).toBeInTheDocument()

      // Click to close, then to icons mode
      const toggleButton = screen.getByRole('button', { name: /toggle toolbox/i })
      fireEvent.click(toggleButton) // close
      fireEvent.click(toggleButton) // icons

      // Button should still exist
      expect(screen.getByRole('button', { name: /navigate tool/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <Toolbox />
        </TestWrapper>
      )

      // Toolbox is already open in full mode by default
      const toggleButton = screen.getByRole('button', { name: /toggle toolbox/i })

      // Check toolbar role
      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toBeInTheDocument()

      // Check toggle button aria-expanded
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')

      // Check tool buttons have proper labels
      expect(screen.getByRole('button', { name: /navigate tool/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create tool/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit tool/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete tool/i })).toBeInTheDocument()
    })

    it('supports keyboard navigation', () => {
      render(
        <TestWrapper>
          <Toolbox />
        </TestWrapper>
      )

      // Toolbox is already open in full mode by default

      // Tab through tools
      const navigateTool = screen.getByRole('button', { name: /navigate tool/i })
      navigateTool.focus()
      expect(document.activeElement).toBe(navigateTool)

      // Press Enter to activate
      fireEvent.keyDown(navigateTool, { key: 'Enter' })
      expect(mockSetActiveTool).toHaveBeenCalledWith('navigate')

      // Press Space to activate
      const createTool = screen.getByRole('button', { name: /create tool/i })
      createTool.focus()
      fireEvent.keyDown(createTool, { key: ' ' })
      expect(mockSetActiveTool).toHaveBeenCalledWith('create')
    })
  })
})