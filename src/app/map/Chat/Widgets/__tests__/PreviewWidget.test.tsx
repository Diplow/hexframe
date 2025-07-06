import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

// These imports will fail initially - that's expected for TDD
import { PreviewWidget } from '../PreviewWidget/PreviewWidget';
import type { PreviewWidgetProps } from '../PreviewWidget/types';

const mockTile = {
  id: 'tile-123',
  title: 'Test Tile',
  description: 'Test description',
  coordId: 'A1',
  content: '# Test Content\n\nThis is test content',
};

describe('PreviewWidget', () => {
  const defaultProps: PreviewWidgetProps = {
    id: 'preview-1',
    tile: mockTile,
    mode: 'view',
    content: mockTile.content,
    onTileUpdate: vi.fn(),
    onTileDelete: vi.fn(),
    onTileMove: vi.fn(),
    onTileSwap: vi.fn(),
    onClose: vi.fn(),
  };

  describe('View mode', () => {
    it('should render tile information in view mode', () => {
      render(<PreviewWidget {...defaultProps} />);

      expect(screen.getByText(mockTile.title)).toBeInTheDocument();
      expect(screen.getByText(mockTile.description)).toBeInTheDocument();
      expect(screen.getByText(/test content/i)).toBeInTheDocument();
    });

    it('should show canvas operation indicator', () => {
      render(<PreviewWidget {...defaultProps} />);

      // Should indicate this is a map-modifying widget
      expect(screen.getByText(/modifies map/i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /map operation/i })).toBeInTheDocument();
    });

    it('should display action buttons in view mode', () => {
      render(<PreviewWidget {...defaultProps} />);

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /move/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /swap/i })).toBeInTheDocument();
    });

    it('should handle edit button click', async () => {
      const mockOnEdit = vi.fn();
      render(<PreviewWidget {...defaultProps} onEdit={mockOnEdit} />);

      const editButton = screen.getByRole('button', { name: /edit/i });
      await userEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledOnce();
    });

    it('should handle delete button click', async () => {
      render(<PreviewWidget {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      expect(defaultProps.onTileDelete).toHaveBeenCalledWith(mockTile.id);
    });
  });

  describe('Edit mode', () => {
    it('should show editor in edit mode', () => {
      render(<PreviewWidget {...defaultProps} mode="edit" />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveValue(mockTile.content);
    });

    it('should show save and cancel buttons in edit mode', () => {
      render(<PreviewWidget {...defaultProps} mode="edit" />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

      // Should not show other action buttons
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('should handle content changes', async () => {
      render(<PreviewWidget {...defaultProps} mode="edit" />);

      const editor = screen.getByRole('textbox');
      await userEvent.clear(editor);
      await userEvent.type(editor, 'New content');

      expect(editor).toHaveValue('New content');
    });

    it('should handle save', async () => {
      const mockOnSave = vi.fn();
      render(<PreviewWidget {...defaultProps} mode="edit" onSave={mockOnSave} />);

      const editor = screen.getByRole('textbox');
      await userEvent.clear(editor);
      await userEvent.type(editor, 'Updated content');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await userEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith('Updated content');
    });

    it('should handle cancel', async () => {
      const mockOnCancel = vi.fn();
      render(<PreviewWidget {...defaultProps} mode="edit" onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledOnce();
    });
  });

  describe('Loading and error states', () => {
    it('should show loading state', () => {
      render(<PreviewWidget {...defaultProps} isLoading />);

      // Check for loading overlay
      const loadingOverlay = screen.getByLabelText(/loading/i);
      expect(loadingOverlay).toBeInTheDocument();
      expect(loadingOverlay).toHaveClass('absolute');

      // Actions should be disabled
      expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
    });

    it('should show error state', () => {
      const error = { message: 'Failed to update tile' };
      render(<PreviewWidget {...defaultProps} error={error} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to update tile')).toBeInTheDocument();
    });
  });

  describe('Expanded state', () => {
    it('should handle expanded state', () => {
      const { container } = render(<PreviewWidget {...defaultProps} isExpanded />);

      const widget = container.querySelector('.widget-container');
      expect(widget).toHaveClass('widget--expanded');

      // Should show more content or different layout when expanded
      expect(screen.getByTestId('expanded-content')).toBeInTheDocument();
    });

    it('should toggle expanded state', async () => {
      const { rerender } = render(<PreviewWidget {...defaultProps} isExpanded={false} />);

      expect(screen.queryByTestId('expanded-content')).not.toBeInTheDocument();

      rerender(<PreviewWidget {...defaultProps} isExpanded={true} />);

      expect(screen.getByTestId('expanded-content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PreviewWidget {...defaultProps} />);

      // Widget container has Map operation label
      const widget = screen.getByRole('article');
      expect(widget).toHaveAttribute('aria-label', expect.stringContaining('Map operation'));

      // Inner content has tile preview label
      expect(screen.getByLabelText('Tile preview')).toBeInTheDocument();

      const editButton = screen.getByRole('button', { name: /edit/i });
      expect(editButton).toHaveAttribute('aria-label', expect.stringContaining('Edit'));
    });

    it('should announce canvas operations', () => {
      render(<PreviewWidget {...defaultProps} />);

      const indicator = screen.getByText(/modifies map/i).parentElement;
      expect(indicator).toHaveAttribute('role', 'status');
      expect(indicator).toHaveAttribute('aria-live', 'polite');
    });

    it('should manage focus in edit mode', async () => {
      render(<PreviewWidget {...defaultProps} mode="edit" />);

      // Editor should be focused when entering edit mode
      const editor = screen.getByRole('textbox');
      await waitFor(() => {
        expect(document.activeElement).toBe(editor);
      });
    });
  });
});