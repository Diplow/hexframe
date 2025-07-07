import '~/test/setup'; // Import test setup FIRST
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TileData } from '../../types/tile-data';

// Set up all mocks before imports
const mockDeleteItemOptimistic = vi.fn();
const mockNavigateToItem = vi.fn();
let mockCenter: string | null = null;
let chatDispatchSpy = vi.fn();

vi.mock('../../Cache/map-cache', () => ({
  useMapCache: () => ({
    deleteItemOptimistic: mockDeleteItemOptimistic,
    navigateToItem: mockNavigateToItem,
    toggleItemExpansionWithURL: vi.fn(),
    get center() { return mockCenter; },
  }),
}));

vi.mock('~/lib/domains/mapping/utils/hex-coordinates', () => ({
  CoordSystem: {
    getParentCoordFromId: vi.fn().mockReturnValue('parent-coord-id'),
  },
}));

vi.mock('../../Chat/ChatProvider', () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => children,
  useChat: () => ({
    dispatch: chatDispatchSpy,
    messages: [],
    loading: false,
    sendMessage: vi.fn(),
  }),
}));

// Import components after mocks
import { DeleteItemDialog } from '../delete-item';

// Extract the mocked ChatProvider from the mock
const ChatProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
// ChatProvider is mocked above, no need to import the real one

describe('DeleteItemDialog', () => {
  const mockTileData: TileData = {
    data: {
      name: 'Test Tile',
      description: 'Test description',
      url: 'http://example.com',
      color: 'blue',
    },
    metadata: {
      coordId: '1,0:1',
      dbId: '123',
      parentId: '1,0:',
      coordinates: {
        userId: 1,
        groupId: 0,
        path: [1],
      },
      depth: 1,
      ownerId: 'user123',
    },
    state: {
      canEdit: true,
      isExpanded: false,
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isDragOver: false,
      isHovering: false,
    },
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    chatDispatchSpy = vi.fn();
    mockCenter = null; // Reset center for each test
  });

  it('should dispatch TILE_DELETED chat message when deleting a tile', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    
    // Mock successful deletion
    mockDeleteItemOptimistic.mockResolvedValue(undefined);
    
    render(
      <ChatProvider>
        <DeleteItemDialog
          isOpen={true}
          onClose={onClose}
          item={mockTileData}
          onSuccess={onSuccess}
        />
      </ChatProvider>
    );
    
    // Dialog should be open
    expect(screen.getByRole('heading', { name: 'Delete Item' })).toBeInTheDocument();
    expect(screen.getByText('Test Tile')).toBeInTheDocument();
    
    // Click the delete button using a more specific selector
    const deleteButton = screen.getByRole('button', { name: /^Delete Item$/ });
    await user.click(deleteButton);
    
    // Wait for deletion to complete
    await waitFor(() => {
      expect(mockDeleteItemOptimistic).toHaveBeenCalledWith('1,0:1');
    });
    
    // Check that the chat dispatch was called
    expect(chatDispatchSpy).toHaveBeenCalledWith({
      type: 'TILE_DELETED',
      payload: { tileName: 'Test Tile' }
    });
    
    // Check callbacks were called
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should not delete user root map items', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    const rootMapItem: TileData = {
      ...mockTileData,
      metadata: {
        ...mockTileData.metadata,
        coordId: '1,0:',
        parentId: undefined,
        coordinates: {
          userId: 1,
          groupId: 0,
          path: [], // Empty path means root item
        },
        depth: 0,
      },
    };
    
    render(
      <ChatProvider>
        <DeleteItemDialog
          isOpen={true}
          onClose={onClose}
          item={rootMapItem}
        />
      </ChatProvider>
    );
    
    // Should show warning about root map
    expect(screen.getByText(/root map and cannot be deleted/)).toBeInTheDocument();
    
    // Delete button should be disabled
    const deleteButton = screen.getByRole('button', { name: 'Delete Item' });
    expect(deleteButton).toBeDisabled();
    
    // Try to click anyway
    await user.click(deleteButton);
    
    // Should not have called delete
    expect(mockDeleteItemOptimistic).not.toHaveBeenCalled();
    expect(chatDispatchSpy).not.toHaveBeenCalled();
  });

  it('should navigate to parent when deleting current center', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    // Mock that this item is the current center
    mockCenter = '1,0:1'; // Same as the item being deleted
    
    mockDeleteItemOptimistic.mockResolvedValue(undefined);
    
    render(
      <ChatProvider>
        <DeleteItemDialog
          isOpen={true}
          onClose={onClose}
          item={mockTileData}
        />
      </ChatProvider>
    );
    
    // Should show note about redirection
    expect(screen.getByText(/redirected to the parent item/)).toBeInTheDocument();
    
    // Click delete
    const deleteButton = screen.getByRole('button', { name: 'Delete Item' });
    await user.click(deleteButton);
    
    // Should navigate to parent first
    await waitFor(() => {
      expect(mockNavigateToItem).toHaveBeenCalledWith('parent-coord-id');
    });
    
    // Then delete
    expect(mockDeleteItemOptimistic).toHaveBeenCalledWith('1,0:1');
  });
});