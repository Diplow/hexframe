import '~/test/setup'; // Import test setup FIRST
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

// These imports will fail initially - that's expected for TDD
import { WidgetContainer } from '../_base/WidgetContainer';
import type { 
  BaseWidgetProps, 
  CanvasOperationProps, 
  AuthenticationProps,
  ConfirmationProps,
  WidgetPriority 
} from '../_base/widget.types';
import { PreviewWidget } from '../PreviewWidget/PreviewWidget';
import { LoginWidget } from '../LoginWidget/LoginWidget';
import { ConfirmDeleteWidget } from '../ConfirmDeleteWidget/ConfirmDeleteWidget';

// Mock tile data for tests
const mockTile = {
  id: '123',
  title: 'Test Tile',
  description: 'Test description',
  coordId: 'A1'
};

describe('Widget Composition', () => {
  describe('BaseWidget behavior', () => {
    it('should render base widget with required props', () => {
      const props: BaseWidgetProps = {
        id: 'widget-1',
        onClose: vi.fn(),
      };

      render(<WidgetContainer {...props}>Test Content</WidgetContainer>);

      // Base widget should have close button
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should handle close callback', async () => {
      const onClose = vi.fn();
      const props: BaseWidgetProps = {
        id: 'widget-1',
        onClose,
      };

      render(<WidgetContainer {...props}>Content</WidgetContainer>);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should show loading state when isLoading is true', () => {
      const props: BaseWidgetProps = {
        id: 'widget-1',
        isLoading: true,
      };

      render(<WidgetContainer {...props}>Content</WidgetContainer>);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
    });

    it('should show error state when error is provided', () => {
      const props: BaseWidgetProps = {
        id: 'widget-1',
        error: { message: 'Something went wrong' },
      };

      render(<WidgetContainer {...props}>Content</WidgetContainer>);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should apply priority styling', () => {
      const priorities: WidgetPriority[] = ['info', 'action', 'critical'];

      priorities.forEach((priority) => {
        const { container } = render(
          <WidgetContainer id={`widget-${priority}`} priority={priority}>
            Content
          </WidgetContainer>
        );

        const widget = container.firstChild as HTMLElement;
        expect(widget).toHaveClass(`widget--${priority}`);
      });
    });

    it('should show timestamp when provided', () => {
      const timestamp = new Date('2025-01-04T10:30:00');
      const props: BaseWidgetProps = {
        id: 'widget-1',
        timestamp,
      };

      render(<WidgetContainer {...props}>Content</WidgetContainer>);

      // Should show formatted timestamp
      expect(screen.getByText(/10:30/)).toBeInTheDocument();
    });

    it('should handle expanded state', () => {
      const props: BaseWidgetProps = {
        id: 'widget-1',
        isExpanded: true,
      };

      const { container } = render(<WidgetContainer {...props}>Content</WidgetContainer>);

      const widget = container.firstChild as HTMLElement;
      expect(widget).toHaveClass('widget--expanded');
    });
  });

  describe('Canvas capability composition', () => {
    it('should compose base widget with canvas capabilities', () => {
      type PreviewProps = BaseWidgetProps & CanvasOperationProps & {
        mode: 'view' | 'edit';
        content: string;
      };

      const props: PreviewProps = {
        id: 'preview-1',
        tile: mockTile,
        onTileUpdate: vi.fn(),
        onTileDelete: vi.fn(),
        onTileMove: vi.fn(),
        onClose: vi.fn(),
        mode: 'view' as const,
        content: 'Preview content',
      };

      render(<PreviewWidget {...props} />);

      // Should have base widget features
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();

      // Should have canvas operation features
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /move/i })).toBeInTheDocument();
    });

    it('should render canvas widget visual indicators', () => {
      const props = {
        id: 'preview-1',
        tile: mockTile,
        onTileUpdate: vi.fn(),
        mode: 'view' as const,
        content: 'Preview content',
      };

      render(<PreviewWidget {...props} />);

      // Should show indicator that this widget modifies the map
      expect(screen.getByText(/modifies map/i)).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /map operation/i })).toBeInTheDocument();
    });

    it('should apply canvas widget styling', () => {
      const props = {
        id: 'preview-1',
        tile: mockTile,
        onTileUpdate: vi.fn(),
        mode: 'view' as const,
        content: 'Preview content',
      };

      const { container } = render(<PreviewWidget {...props} />);

      const widget = container.querySelector('.widget-container');
      expect(widget).toHaveClass('widget--canvas-operation');
    });
  });

  describe('Authentication capability composition', () => {
    it('should compose base widget with auth capabilities', () => {
      type LoginProps = BaseWidgetProps & AuthenticationProps & {
        message?: string;
      };

      const props: LoginProps = {
        id: 'login-1',
        onAuthenticate: vi.fn(),
        onCancel: vi.fn(),
        onClose: vi.fn(),
        message: 'Please log in to continue',
      };

      render(<LoginWidget {...props} />);

      // Should have base widget features
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();

      // Should have auth features
      expect(screen.getByText('Please log in to continue')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should handle authentication flow', async () => {
      const onAuthenticate = vi.fn();
      const props = {
        id: 'login-1',
        onAuthenticate,
        onCancel: vi.fn(),
      };

      render(<LoginWidget {...props} />);

      const loginButton = screen.getByRole('button', { name: /log in/i });
      await userEvent.click(loginButton);

      expect(onAuthenticate).toHaveBeenCalledOnce();
    });
  });

  describe('Confirmation capability composition', () => {
    it('should compose base widget with confirmation capabilities', () => {
      type DeleteProps = BaseWidgetProps & CanvasOperationProps & ConfirmationProps & {
        itemName: string;
      };

      const props: DeleteProps = {
        id: 'delete-1',
        tile: mockTile,
        onTileDelete: vi.fn(),
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
        onClose: vi.fn(),
        confirmText: 'Delete',
        cancelText: 'Cancel',
        itemName: 'Test Tile',
      };

      render(<ConfirmDeleteWidget {...props} />);

      // Should have base widget features
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();

      // Should have confirmation features
      expect(screen.getByText(/delete.*test tile/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

      // Should have canvas indicators
      expect(screen.getByText(/modifies map/i)).toBeInTheDocument();
    });

    it('should handle confirmation flow', async () => {
      const onConfirm = vi.fn();
      const onTileDelete = vi.fn();
      const props = {
        id: 'delete-1',
        tile: mockTile,
        onTileDelete,
        onConfirm,
        onCancel: vi.fn(),
        confirmText: 'Delete',
        itemName: 'Test Tile',
      };

      render(<ConfirmDeleteWidget {...props} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);

      expect(onConfirm).toHaveBeenCalledOnce();
      expect(onTileDelete).toHaveBeenCalledWith(mockTile.id);
    });
  });

  describe('Widget Container composition patterns', () => {
    it('should support custom widget content', () => {
      const CustomContent = () => (
        <div>
          <h3>Custom Widget</h3>
          <p>Custom content goes here</p>
        </div>
      );

      render(
        <WidgetContainer id="custom-1" priority="info">
          <CustomContent />
        </WidgetContainer>
      );

      expect(screen.getByText('Custom Widget')).toBeInTheDocument();
      expect(screen.getByText('Custom content goes here')).toBeInTheDocument();
    });

    it('should handle multiple capability composition', () => {
      // A widget that has both canvas and confirmation capabilities
      type ComplexProps = BaseWidgetProps & CanvasOperationProps & ConfirmationProps;

      const ComplexWidget = (props: ComplexProps) => (
        <WidgetContainer {...props} className="widget--canvas-operation">
          <div>
            <p>This widget modifies the map and requires confirmation</p>
            <button onClick={() => props.onTileUpdate?.(props.tile.id, {})}>
              Update Tile
            </button>
            <button onClick={props.onConfirm}>Confirm</button>
            <button onClick={props.onCancel}>Cancel</button>
          </div>
        </WidgetContainer>
      );

      const props: ComplexProps = {
        id: 'complex-1',
        tile: mockTile,
        onTileUpdate: vi.fn(),
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
        confirmText: 'Confirm',
        cancelText: 'Cancel',
      };

      render(<ComplexWidget {...props} />);

      expect(screen.getByText(/modifies the map/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update tile/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
  });

  describe('Widget accessibility', () => {
    it('should have proper ARIA attributes', () => {
      // Test regular widget (non-critical)
      const { rerender } = render(
        <WidgetContainer id="a11y-1" priority="info">
          Information
        </WidgetContainer>
      );

      let widget = screen.getByRole('article');
      expect(widget).toHaveAttribute('aria-label', expect.stringContaining('widget'));
      expect(widget).toHaveAttribute('aria-live', 'polite');
      
      // Test critical widget
      rerender(
        <WidgetContainer id="a11y-2" priority="critical">
          Critical information
        </WidgetContainer>
      );
      
      widget = screen.getByRole('article');
      expect(widget).toHaveAttribute('aria-label', expect.stringContaining('Critical'));
      expect(widget).toHaveAttribute('aria-live', 'assertive');
    });

    it('should manage focus properly', async () => {
      const onClose = vi.fn();
      render(
        <WidgetContainer id="focus-1" onClose={onClose}>
          <button>Action 1</button>
          <button>Action 2</button>
        </WidgetContainer>
      );

      // Tab through widget elements
      // Note: Close button comes first in tab order since it's positioned at the top
      const closeButton = screen.getByRole('button', { name: /close/i });
      const action1 = screen.getByRole('button', { name: /action 1/i });
      const action2 = screen.getByRole('button', { name: /action 2/i });

      closeButton.focus();
      expect(document.activeElement).toBe(closeButton);

      await userEvent.tab();
      expect(document.activeElement).toBe(action1);

      await userEvent.tab();
      expect(document.activeElement).toBe(action2);
    });
  });
});