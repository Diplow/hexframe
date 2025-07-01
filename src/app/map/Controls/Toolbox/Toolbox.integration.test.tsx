import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Toolbox } from './Toolbox'
import { TileActionsProvider, useTileActions } from '../../Canvas/TileActionsContext'
import { createMockTileData } from '../../test-utils/mockTileData'
import { ThemeProvider } from '~/contexts/ThemeContext'

describe('Toolbox Integration', () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    clear: vi.fn(),
    removeItem: vi.fn(),
    length: 0,
    key: vi.fn(),
  }
  
  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    })
  })
  // Simple test component that shows current tool
  function ToolDisplay() {
    const { activeTool, onTileClick } = useTileActions()
    return (
      <div>
        <div data-testid="active-tool">{activeTool}</div>
        <button 
          data-testid="test-tile"
          onClick={() => onTileClick(createMockTileData())}
        >
          Test Tile
        </button>
      </div>
    )
  }

  interface TestAppProps {
    onNavigateClick?: (data: ReturnType<typeof createMockTileData>) => void;
    onCreateClick?: (data: ReturnType<typeof createMockTileData>) => void;
    onEditClick?: (data: ReturnType<typeof createMockTileData>) => void;
    onDeleteClick?: (data: ReturnType<typeof createMockTileData>) => void;
  }

  function TestApp({ onNavigateClick, onCreateClick, onEditClick, onDeleteClick }: TestAppProps) {
    return (
      <ThemeProvider>
        <TileActionsProvider
          onNavigateClick={onNavigateClick}
          onCreateClick={onCreateClick}
          onEditClick={onEditClick}
          onDeleteClick={onDeleteClick}
        >
          <Toolbox />
          <ToolDisplay />
        </TileActionsProvider>
      </ThemeProvider>
    )
  }

  describe('Tool-based Interactions', () => {
    it('clicking with different tools triggers appropriate actions', () => {
      const mockHandlers = {
        onNavigateClick: vi.fn(),
        onCreateClick: vi.fn(),
        onEditClick: vi.fn(),
        onDeleteClick: vi.fn(),
      }
      
      render(<TestApp {...mockHandlers} />)

      // Open toolbox
      const toggleButton = screen.getByRole('button', { name: /toggle toolbox/i })
      fireEvent.click(toggleButton)

      const tile = screen.getByTestId('test-tile')

      // Default tool is expand, switch to navigate first
      const navigateTool = screen.getByRole('button', { name: /navigate tool/i })
      fireEvent.click(navigateTool)
      
      // Test navigate tool
      fireEvent.click(tile)
      expect(mockHandlers.onNavigateClick).toHaveBeenCalled()

      // Switch to edit tool
      const editTool = screen.getByRole('button', { name: /edit tool/i })
      fireEvent.click(editTool)
      fireEvent.click(tile)
      expect(mockHandlers.onEditClick).toHaveBeenCalled()

      // Switch to delete tool
      const deleteTool = screen.getByRole('button', { name: /delete tool/i })
      fireEvent.click(deleteTool)
      fireEvent.click(tile)
      expect(mockHandlers.onDeleteClick).toHaveBeenCalled()

      // Switch to create tool
      const createTool = screen.getByRole('button', { name: /create tool/i })
      fireEvent.click(createTool)
      fireEvent.click(tile)
      expect(mockHandlers.onCreateClick).toHaveBeenCalled()
    })

    it('shows current active tool', () => {
      render(<TestApp />)

      // Check default tool
      expect(screen.getByTestId('active-tool')).toHaveTextContent('expand')

      // Open toolbox
      const toggleButton = screen.getByRole('button', { name: /toggle toolbox/i })
      fireEvent.click(toggleButton)

      // Switch to edit tool
      const editTool = screen.getByRole('button', { name: /edit tool/i })
      fireEvent.click(editTool)
      
      expect(screen.getByTestId('active-tool')).toHaveTextContent('edit')
    })
  })

  // Skip visual feedback tests for now as they require actual tile components
  describe.skip('Visual Feedback', () => {
    it('shows different cursors for different tools', () => {
      // Implementation needed when integrating with actual tile components
    })

    it('highlights tiles on hover based on active tool', () => {
      // Implementation needed when integrating with actual tile components
    })
  })

  describe('Keyboard Integration', () => {
    it('keyboard shortcuts work globally to switch tools', () => {
      render(<TestApp />)

      // Open toolbox to see visual feedback
      const toggleButton = screen.getByRole('button', { name: /toggle toolbox/i })
      fireEvent.click(toggleButton)

      // Press 'C' for create tool
      fireEvent.keyDown(document, { key: 'c' })
      
      const createTool = screen.getByRole('button', { name: /create tool/i })
      expect(createTool).toHaveAttribute('aria-pressed', 'true')

      // Press 'E' for edit tool
      fireEvent.keyDown(document, { key: 'e' })
      
      const editTool = screen.getByRole('button', { name: /edit tool/i })
      expect(editTool).toHaveAttribute('aria-pressed', 'true')

      // Press 'Escape' to return to expand (default)
      fireEvent.keyDown(document, { key: 'Escape' })
      
      // Verify tool changed to expand (default)
      expect(screen.getByTestId('active-tool')).toHaveTextContent('expand')
    })

    it('prevents tool switching when typing in tile content', () => {
      render(<TestApp />)

      // Open toolbox
      const toggleButton = screen.getByRole('button', { name: /toggle toolbox/i })
      fireEvent.click(toggleButton)

      // Switch to edit tool
      const editTool = screen.getByRole('button', { name: /edit tool/i })
      fireEvent.click(editTool)

      // Click on tile to start editing
      const tile = screen.getByText('Test Tile')
      fireEvent.click(tile)

      // Simulate typing in an input field
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      // Try to switch tools with keyboard
      fireEvent.keyDown(input, { key: 'd' })

      // Tool should still be edit
      expect(editTool).toHaveAttribute('aria-pressed', 'true')

      // Cleanup
      document.body.removeChild(input)
    })
  })

  describe('State Persistence', () => {
    it('maintains tool selection across toolbox toggle', () => {
      render(<TestApp />)

      // Open toolbox
      const toggleButton = screen.getByRole('button', { name: /toggle toolbox/i })
      fireEvent.click(toggleButton)

      // Select edit tool
      const editTool = screen.getByRole('button', { name: /edit tool/i })
      fireEvent.click(editTool)

      // Verify tool is selected
      expect(screen.getByTestId('active-tool')).toHaveTextContent('edit')

      // Close toolbox
      fireEvent.click(toggleButton)

      // Tool should still be edit even when toolbox is closed
      expect(screen.getByTestId('active-tool')).toHaveTextContent('edit')
    })

    it('stores display mode preference in localStorage', () => {
      render(<TestApp />)

      const toggleButton = screen.getByRole('button', { name: /toggle toolbox/i })
      
      // Should start in full mode by default (position 2)
      // First click should cycle to position 0 (closed)
      fireEvent.click(toggleButton)
      
      // Click to go to icons mode (position 1)
      fireEvent.click(toggleButton)
      
      // Click to go back to full mode (position 2)
      fireEvent.click(toggleButton)
      
      // Check that localStorage was called with the expected values at some point
      expect(localStorageMock.setItem).toHaveBeenCalledWith('toolbox-cycle-position', '0')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('toolbox-cycle-position', '1')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('toolbox-cycle-position', '2')
    })
  })
})