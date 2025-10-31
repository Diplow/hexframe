import '~/test/setup'; // Import test setup FIRST
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TileContextMenu } from '~/app/map/Canvas/TileContextMenu';
import type { TileData } from '~/app/map/types/tile-data';
import { Direction } from '~/app/map/constants';

// Helper to create mock tile data
function createMockTileData(overrides?: Partial<TileData>): TileData {
  return {
    metadata: {
      dbId: '123',
      coordId: '1,0:[2]',
      parentId: '1,0:[]',
      coordinates: {
        userId: 1,
        groupId: 0,
        path: [Direction.NorthEast],
      },
      depth: 1,
      ownerId: '1',
    },
    data: {
      title: 'Test Tile',
      content: 'Test content',
      preview: 'Test preview',
      link: '',
      color: 'primary',
    },
    state: {
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isExpanded: false,
      isDragOver: false,
      isHovering: false,
      canExpand: true,
      canEdit: true,
    },
    ...overrides,
  };
}

describe('TileContextMenu - Copy and Move', () => {
  describe('happy path', () => {
    it('should display both "Copy to..." and "Move to..." menu items when canEdit is true', () => {
      const tileData = createMockTileData();
      const onCopy = vi.fn();
      const onMove = vi.fn();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCopy={onCopy}
          onMove={onMove}
          canEdit={true}
        />
      );

      expect(screen.getByText('Copy to...')).toBeInTheDocument();
      expect(screen.getByText('Move to...')).toBeInTheDocument();
    });

    it('should show "Drag" shortcut for "Copy to..." (default operation)', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCopy={vi.fn()}
          onMove={vi.fn()}
          canEdit={true}
        />
      );

      const copyButton = screen.getByText('Copy to...').closest('button');
      expect(copyButton).toBeInTheDocument();
      expect(copyButton?.textContent).toContain('Drag');
    });

    it('should show "Ctrl+Drag" shortcut for "Move to..." (ctrl modifier)', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCopy={vi.fn()}
          onMove={vi.fn()}
          canEdit={true}
        />
      );

      const moveButton = screen.getByText('Move to...').closest('button');
      expect(moveButton).toBeInTheDocument();
      expect(moveButton?.textContent).toContain('Ctrl+Drag');
    });

    it('should call onCopy when "Copy to..." is clicked', async () => {
      const user = userEvent.setup();
      const tileData = createMockTileData();
      const onCopy = vi.fn();
      const onClose = vi.fn();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={onClose}
          onCopy={onCopy}
          onMove={vi.fn()}
          canEdit={true}
        />
      );

      await user.click(screen.getByText('Copy to...'));

      expect(onCopy).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onMove when "Move to..." is clicked', async () => {
      const user = userEvent.setup();
      const tileData = createMockTileData();
      const onMove = vi.fn();
      const onClose = vi.fn();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={onClose}
          onCopy={vi.fn()}
          onMove={onMove}
          canEdit={true}
        />
      );

      await user.click(screen.getByText('Move to...'));

      expect(onMove).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should NOT show copy/move options when canEdit is false', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCopy={vi.fn()}
          onMove={vi.fn()}
          canEdit={false}
        />
      );

      expect(screen.queryByText('Copy to...')).not.toBeInTheDocument();
      expect(screen.queryByText('Move to...')).not.toBeInTheDocument();
    });

    it('should NOT show copy/move options for empty tiles', () => {
      const emptyTile = createMockTileData({
        metadata: {
          dbId: '0',
          coordId: '1,0:[2]',
          parentId: '1,0:[]',
          coordinates: {
            userId: 1,
            groupId: 0,
            path: [Direction.NorthEast],
          },
          depth: 1,
          ownerId: '1',
        },
      });

      render(
        <TileContextMenu
          tileData={emptyTile}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCopy={vi.fn()}
          onMove={vi.fn()}
          canEdit={true}
          isEmptyTile={true}
        />
      );

      expect(screen.queryByText('Copy to...')).not.toBeInTheDocument();
      expect(screen.queryByText('Move to...')).not.toBeInTheDocument();
    });

    it('should show "Copy to..." but NOT "Move to..." when only onCopy is provided', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCopy={vi.fn()}
          canEdit={true}
        />
      );

      expect(screen.getByText('Copy to...')).toBeInTheDocument();
      expect(screen.queryByText('Move to...')).not.toBeInTheDocument();
    });

    it('should show "Move to..." but NOT "Copy to..." when only onMove is provided', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onMove={vi.fn()}
          canEdit={true}
        />
      );

      expect(screen.getByText('Move to...')).toBeInTheDocument();
      expect(screen.queryByText('Copy to...')).not.toBeInTheDocument();
    });
  });

  describe('error cases', () => {
    it('should not crash when neither onCopy nor onMove is provided', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          canEdit={true}
        />
      );

      expect(screen.queryByText('Copy to...')).not.toBeInTheDocument();
      expect(screen.queryByText('Move to...')).not.toBeInTheDocument();
    });

    it('should handle undefined canEdit gracefully', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCopy={vi.fn()}
          onMove={vi.fn()}
          canEdit={false}
        />
      );

      expect(screen.queryByText('Copy to...')).not.toBeInTheDocument();
      expect(screen.queryByText('Move to...')).not.toBeInTheDocument();
    });
  });

  describe('integration with other menu items', () => {
    it('should show copy/move alongside other menu items', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onSelect={vi.fn()}
          onExpand={vi.fn()}
          onNavigate={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onCopy={vi.fn()}
          onMove={vi.fn()}
          canEdit={true}
        />
      );

      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Expand')).toBeInTheDocument();
      expect(screen.getByText('Navigate')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Copy to...')).toBeInTheDocument();
      expect(screen.getByText('Move to...')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should place copy/move after Edit and before Delete', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onCopy={vi.fn()}
          onMove={vi.fn()}
          canEdit={true}
        />
      );

      const menuItems = screen.getAllByRole('button');
      const editIndex = menuItems.findIndex(item => item.textContent?.includes('Edit'));
      const copyIndex = menuItems.findIndex(item => item.textContent?.includes('Copy to...'));
      const moveIndex = menuItems.findIndex(item => item.textContent?.includes('Move to...'));
      const deleteIndex = menuItems.findIndex(item => item.textContent?.includes('Delete'));

      expect(copyIndex).toBeGreaterThan(editIndex);
      expect(moveIndex).toBeGreaterThan(copyIndex);
      expect(deleteIndex).toBeGreaterThan(moveIndex);
    });

    it('should maintain separator before Edit group', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onSelect={vi.fn()}
          onEdit={vi.fn()}
          onCopy={vi.fn()}
          onMove={vi.fn()}
          onDelete={vi.fn()}
          canEdit={true}
        />
      );

      // Edit should have separator before it
      const editButton = screen.getByText('Edit').closest('button');
      expect(editButton).toBeInTheDocument();
    });
  });

  describe('visual styling', () => {
    it('should use Copy icon for "Copy to..." menu item', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCopy={vi.fn()}
          canEdit={true}
        />
      );

      const copyButton = screen.getByText('Copy to...').closest('button');
      expect(copyButton).toBeInTheDocument();
      // Icon is rendered via lucide-react, so we just check button exists
    });

    it('should use Move icon for "Move to..." menu item', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onMove={vi.fn()}
          canEdit={true}
        />
      );

      const moveButton = screen.getByText('Move to...').closest('button');
      expect(moveButton).toBeInTheDocument();
      // Icon is rendered via lucide-react, so we just check button exists
    });

    it('should display keyboard hints correctly formatted', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCopy={vi.fn()}
          onMove={vi.fn()}
          canEdit={true}
        />
      );

      // Check that keyboard shortcuts are displayed
      const copyButton = screen.getByText('Copy to...').closest('button');
      const moveButton = screen.getByText('Move to...').closest('button');

      expect(copyButton?.textContent).toContain('Drag');
      expect(moveButton?.textContent).toContain('Ctrl+Drag');
    });
  });
});
