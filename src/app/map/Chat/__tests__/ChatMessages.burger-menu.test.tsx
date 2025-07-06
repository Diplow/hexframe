import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Messages } from '../Messages';
import type { Message } from '../_cache/_events/event.types';

// Mock the dialogs
vi.mock('../../Dialogs/update-item', () => ({
  UpdateItemDialog: ({ isOpen }: { isOpen: boolean; onClose: () => void }) => 
    isOpen ? <div data-testid="update-dialog">Update Dialog</div> : null
}));

vi.mock('../../Dialogs/delete-item', () => ({
  DeleteItemDialog: ({ isOpen }: { isOpen: boolean; onClose: () => void }) => 
    isOpen ? <div data-testid="delete-dialog">Delete Dialog</div> : null
}));

// Mock the map cache hook
const mockItems = {
  'tile-123': {
    metadata: {
      dbId: 123,
      coordId: 'tile-123',
      coordinates: { path: ['1', '2'] },
      depth: 2,
    },
    data: {
      name: 'Test Tile',
      description: 'Test description',
      url: 'https://example.com',
    },
    state: {
      isExpanded: false,
      canExpand: true,
      canEdit: true,
    },
  },
};

const mockUseMapCache = vi.fn(() => ({
  items: mockItems,
  navigateToItem: vi.fn(),
}));

vi.mock('../../Cache/_hooks/use-map-cache', () => ({
  useMapCache: () => mockUseMapCache(),
}));

describe('ChatMessages - Burger Menu Integration', () => {
  const previewMessage: Message = {
    id: 'msg-1',
    actor: 'system',
    timestamp: new Date(),
    content: 'Showing preview for Test Tile',
  };

  beforeEach(() => {
    // Reset mock to default value before each test
    mockUseMapCache.mockReturnValue({
      items: mockItems,
      navigateToItem: vi.fn(),
    });
  });

  it('should render preview widget with burger menu when tile data is available', () => {
    render(
      <Messages
        messages={[previewMessage]}
        widgets={[{
          id: 'widget-1',
          type: 'preview',
          data: {
            tileId: 'tile-123',
            tile: mockItems['tile-123'],
            mode: 'view',
          },
          priority: 'info',
          timestamp: new Date(),
        }]}
      />
    );

    // Check that preview widget is rendered
    expect(screen.getByTestId('preview-widget')).toBeInTheDocument();

    // Check that burger menu is rendered
    const menuButton = screen.getByLabelText('More options');
    expect(menuButton).toBeInTheDocument();
  });

  it('should open update dialog when Edit is clicked', async () => {
    render(
      <Messages
        messages={[previewMessage]}
        widgets={[{
          id: 'widget-1',
          type: 'preview',
          data: {
            tileId: 'tile-123',
            tile: mockItems['tile-123'],
            mode: 'view',
          },
          priority: 'info',
          timestamp: new Date(),
        }]}
      />
    );

    // Click burger menu
    const menuButton = screen.getByLabelText('More options');
    fireEvent.click(menuButton);

    // Click Edit
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    // Check that update dialog is shown
    expect(screen.getByTestId('update-dialog')).toBeInTheDocument();
  });

  it('should open delete dialog when Delete is clicked', async () => {
    render(
      <Messages
        messages={[previewMessage]}
        widgets={[{
          id: 'widget-1',
          type: 'preview',
          data: {
            tileId: 'tile-123',
            tile: mockItems['tile-123'],
            mode: 'view',
          },
          priority: 'info',
          timestamp: new Date(),
        }]}
      />
    );

    // Click burger menu
    const menuButton = screen.getByLabelText('More options');
    fireEvent.click(menuButton);

    // Click Delete
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Check that delete dialog is shown
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
  });

  it('should not show burger menu when tile data is not available', () => {
    // Mock empty items - need to use mockImplementation since it's called twice
    mockUseMapCache.mockImplementation(() => ({
      items: {},
      navigateToItem: vi.fn(),
    } as ReturnType<typeof mockUseMapCache>));

    render(
      <Messages
        messages={[previewMessage]}
        widgets={[{
          id: 'widget-1',
          type: 'preview',
          data: {
            tileId: 'tile-123',
            tile: undefined, // No tile data available
            mode: 'view',
          },
          priority: 'info',
          timestamp: new Date(),
        }]}
      />
    );

    // Check that preview widget is rendered but no burger menu
    expect(screen.getByTestId('preview-widget')).toBeInTheDocument();
    expect(screen.queryByLabelText('More options')).not.toBeInTheDocument();
  });

});