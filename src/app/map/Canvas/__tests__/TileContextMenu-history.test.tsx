import '~/test/setup';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TileContextMenu } from '~/app/map/Canvas/TileContextMenu';
import type { TileData } from '~/app/map/types/tile-data';
import { Visibility } from '~/lib/domains/mapping/utils';

describe('TileContextMenu - History Integration', () => {
  const mockTileData: TileData = {
    metadata: {
      coordId: '1,0:1',
      dbId: '123',
      parentId: '1,0:',
      coordinates: { userId: "user-test-1", groupId: 0, path: [1] },
      depth: 1,
      ownerId: '1',
    },
    data: {
      title: 'Test Tile',
      content: 'Test content',
      preview: 'Test preview',
      link: '',
      color: 'bg-primary-50',
      visibility: Visibility.PRIVATE,
    },
    state: {
      isExpanded: false,
      canExpand: true,
      canEdit: false,
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isDragOver: false,
      isHovering: false,
    },
  };

  const defaultProps = {
    tileData: mockTileData,
    position: { x: 100, y: 100 },
    onClose: vi.fn(),
    canEdit: false,
    isEmptyTile: false,
  };

  it('should show View History option when onViewHistory is provided', () => {
    const onViewHistory = vi.fn();

    render(
      <TileContextMenu
        {...defaultProps}
        onViewHistory={onViewHistory}
      />
    );

    expect(screen.getByText('View History')).toBeInTheDocument();
  });

  it('should call onViewHistory when View History is clicked', async () => {
    const user = userEvent.setup();
    const onViewHistory = vi.fn();

    render(
      <TileContextMenu
        {...defaultProps}
        onViewHistory={onViewHistory}
      />
    );

    const historyButton = screen.getByText('View History');
    await user.click(historyButton);

    expect(onViewHistory).toHaveBeenCalledTimes(1);
  });

  it('should not show View History for empty tiles', () => {
    const onViewHistory = vi.fn();

    render(
      <TileContextMenu
        {...defaultProps}
        isEmptyTile={true}
        onViewHistory={onViewHistory}
      />
    );

    expect(screen.queryByText('View History')).not.toBeInTheDocument();
  });

  it('should not show View History when callback is not provided', () => {
    render(<TileContextMenu {...defaultProps} />);

    expect(screen.queryByText('View History')).not.toBeInTheDocument();
  });

  it('should show View History alongside other menu items', () => {
    const onViewHistory = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <TileContextMenu
        {...defaultProps}
        canEdit={true}
        onViewHistory={onViewHistory}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('View History')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});
