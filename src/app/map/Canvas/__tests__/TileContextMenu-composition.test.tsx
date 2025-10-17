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
      ownerId: 1,
    },
    data: {
      title: 'Test Tile',
      content: 'Test content',
      preview: 'Test preview',
      link: null,
      color: 'bg-blue-500',
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

describe('TileContextMenu - Show Composition', () => {
  describe('happy path', () => {
    it('should display "Show Composition" option for center tile with composition at scale > 1', () => {
      const centerTile = createMockTileData({
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
          ownerId: 1,
        },
      });

      const onCompositionToggle = vi.fn();

      render(
        <TileContextMenu
          tileData={centerTile}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onSelect={vi.fn()}
          onExpand={vi.fn()}
          onNavigate={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onCreate={vi.fn()}
          onCompositionToggle={onCompositionToggle}
          canEdit={true}
          hasComposition={true}
          isCompositionExpanded={false}
          canShowComposition={true}
        />
      );

      expect(screen.getByText('Show Composition')).toBeInTheDocument();
    });

    it('should display "Hide Composition" when composition is already expanded', () => {
      const centerTile = createMockTileData();
      const onCompositionToggle = vi.fn();

      render(
        <TileContextMenu
          tileData={centerTile}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCompositionToggle={onCompositionToggle}
          canEdit={true}
          hasComposition={true}
          isCompositionExpanded={true}
          canShowComposition={true}
        />
      );

      expect(screen.getByText('Hide Composition')).toBeInTheDocument();
    });

    it('should call onCompositionToggle when "Show Composition" is clicked', async () => {
      const user = userEvent.setup();
      const centerTile = createMockTileData();
      const onCompositionToggle = vi.fn();
      const onClose = vi.fn();

      render(
        <TileContextMenu
          tileData={centerTile}
          position={{ x: 100, y: 100 }}
          onClose={onClose}
          onCompositionToggle={onCompositionToggle}
          canEdit={true}
          hasComposition={true}
          isCompositionExpanded={false}
          canShowComposition={true}
        />
      );

      await user.click(screen.getByText('Show Composition'));

      expect(onCompositionToggle).toHaveBeenCalledTimes(1);
      expect(onCompositionToggle).toHaveBeenCalledWith(centerTile);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should NOT show "Show Composition" for side tiles (non-center)', () => {
      // Side tile has path length > 1 and is not a center coordinate
      const sideTile = createMockTileData({
        metadata: {
          dbId: '124',
          coordId: '1,0:[2,3]',
          parentId: '1,0:[2]',
          coordinates: {
            userId: 1,
            groupId: 0,
            path: [Direction.NorthEast, Direction.East],
          },
          depth: 2,
          ownerId: 1,
        },
      });

      render(
        <TileContextMenu
          tileData={sideTile}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCompositionToggle={vi.fn()}
          canEdit={true}
          hasComposition={true}
          isCompositionExpanded={false}
          canShowComposition={false}
        />
      );

      expect(screen.queryByText('Show Composition')).not.toBeInTheDocument();
    });

    it('should NOT show "Show Composition" for scale-1 tiles (minimum scale)', () => {
      const scale1Tile = createMockTileData();

      render(
        <TileContextMenu
          tileData={scale1Tile}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCompositionToggle={vi.fn()}
          canEdit={true}
          hasComposition={true}
          isCompositionExpanded={false}
          canShowComposition={false}
        />
      );

      expect(screen.queryByText('Show Composition')).not.toBeInTheDocument();
    });

    it('should NOT show "Show Composition" when tile has no composition', () => {
      const tileWithoutComposition = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileWithoutComposition}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCompositionToggle={vi.fn()}
          canEdit={true}
          hasComposition={false}
          isCompositionExpanded={false}
          canShowComposition={true}
        />
      );

      expect(screen.queryByText('Show Composition')).not.toBeInTheDocument();
    });

    it('should hide "Show Composition" for empty tiles', () => {
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
          ownerId: 1,
        },
      });

      render(
        <TileContextMenu
          tileData={emptyTile}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onCompositionToggle={vi.fn()}
          canEdit={true}
          hasComposition={false}
          isCompositionExpanded={false}
          canShowComposition={false}
          isEmptyTile={true}
        />
      );

      expect(screen.queryByText('Show Composition')).not.toBeInTheDocument();
    });
  });

  describe('error cases', () => {
    it('should not crash when onCompositionToggle is undefined', () => {
      const centerTile = createMockTileData();

      render(
        <TileContextMenu
          tileData={centerTile}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          canEdit={true}
          hasComposition={true}
          isCompositionExpanded={false}
          canShowComposition={true}
        />
      );

      // Should still render the option but not crash when clicked
      expect(screen.queryByText('Show Composition')).toBeInTheDocument();
    });

    it('should handle missing composition flags gracefully', () => {
      const centerTile = createMockTileData();

      // Render without hasComposition, isCompositionExpanded, canShowComposition
      render(
        <TileContextMenu
          tileData={centerTile}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          canEdit={true}
        />
      );

      // Should not show composition option when flags are missing
      expect(screen.queryByText('Show Composition')).not.toBeInTheDocument();
    });
  });

  describe('integration with other menu items', () => {
    it('should show "Show Composition" alongside other menu items', () => {
      const centerTile = createMockTileData();

      render(
        <TileContextMenu
          tileData={centerTile}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onSelect={vi.fn()}
          onExpand={vi.fn()}
          onNavigate={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onCompositionToggle={vi.fn()}
          canEdit={true}
          hasComposition={true}
          isCompositionExpanded={false}
          canShowComposition={true}
        />
      );

      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Expand')).toBeInTheDocument();
      expect(screen.getByText('Navigate')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Show Composition')).toBeInTheDocument();
    });

    it('should place "Show Composition" after expansion options', () => {
      const centerTile = createMockTileData();

      render(
        <TileContextMenu
          tileData={centerTile}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onExpand={vi.fn()}
          onCompositionToggle={vi.fn()}
          canEdit={true}
          hasComposition={true}
          isCompositionExpanded={false}
          canShowComposition={true}
        />
      );

      const menuItems = screen.getAllByRole('button');
      const expandIndex = menuItems.findIndex(item => item.textContent?.includes('Expand'));
      const compositionIndex = menuItems.findIndex(item => item.textContent?.includes('Show Composition'));

      expect(compositionIndex).toBeGreaterThan(expandIndex);
    });
  });
});
