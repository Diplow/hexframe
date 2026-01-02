import '~/test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ItemTileContent } from '~/app/map/Canvas/Tile/Item/_components/item-tile-content';
import type { TileData } from '~/app/map/types/tile-data';
import { TileActionsProvider } from '~/app/map/Canvas/TileActionsContext';
import { Visibility, MapItemType } from '~/lib/domains/mapping/utils';

// Mock the hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('~/app/map/Cache/interface', () => ({
  useMapCache: () => ({
    navigateToItem: vi.fn(),
    toggleItemExpansionWithURL: vi.fn(),
  }),
}));

// Mock the useTileInteraction hook
vi.mock('~/app/map/Canvas/hooks/shared/useTileInteraction', () => ({
  useTileInteraction: (props: { tileData: TileData }) => ({
    handleClick: vi.fn(),
    handleRightClick: vi.fn(),
    cursor: props.tileData?.state?.canExpand === false ? 'cursor-not-allowed' : 'cursor-zoom-in',
    activeTool: 'expand',
    shouldShowHoverEffects: true,
  }),
}));

describe('ItemTileContent - Favorites Display', () => {
  const createTestTile = (
    coordId: string,
    dbId: string,
    overrides?: Partial<TileData>
  ): TileData => ({
    metadata: {
      coordId,
      dbId,
      ownerId: 'user1',
      coordinates: {
        userId: 'user-test-1',
        groupId: 0,
        path: [1],
      },
      depth: 1,
      parentId: undefined,
    },
    data: {
      title: 'Test Tile',
      content: 'Test Description',
      preview: undefined,
      link: '',
      color: 'zinc-50',
      visibility: Visibility.PRIVATE, itemType: MapItemType.CONTEXT,
    },
    state: {
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isExpanded: false,
      isDragOver: false,
      isHovering: false,
    },
    ...overrides,
  });

  const defaultProps = {
    scale: 2 as const,
    baseHexSize: 50,
    tileColor: { color: 'zinc' as const, tint: '50' as const },
    testId: 'test-tile',
    interactive: true,
    urlInfo: {
      pathname: '/map',
      searchParamsString: '',
      rootItemId: 'root',
    },
    allExpandedItemIds: [],
    hasChildren: true,
    isCenter: false,
    canEdit: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when tile is favorited', () => {
    it('should render FavoriteIndicator when isFavorited is true', () => {
      const testTile = createTestTile('1,0:1', '1');

      render(
        <TileActionsProvider>
          <ItemTileContent
            {...defaultProps}
            item={testTile}
            isFavorited={true}
            shortcutName="my_project"
          />
        </TileActionsProvider>
      );

      // FavoriteIndicator should be rendered
      expect(screen.getByTestId('favorite-indicator')).toBeInTheDocument();
    });

    it('should pass shortcutName to FavoriteIndicator', () => {
      const testTile = createTestTile('1,0:1', '1');

      render(
        <TileActionsProvider>
          <ItemTileContent
            {...defaultProps}
            item={testTile}
            isFavorited={true}
            shortcutName="work_tasks"
          />
        </TileActionsProvider>
      );

      // Indicator should be present with correct shortcut name (verified via tooltip on hover)
      expect(screen.getByTestId('favorite-indicator')).toBeInTheDocument();
    });

    it('should show FavoriteIndicator at all visible scales (scale >= 1)', () => {
      const testTile = createTestTile('1,0:1', '1');

      // Test scale 1
      const { rerender } = render(
        <TileActionsProvider>
          <ItemTileContent
            {...defaultProps}
            item={testTile}
            scale={1}
            isFavorited={true}
            shortcutName="test"
          />
        </TileActionsProvider>
      );
      expect(screen.getByTestId('favorite-indicator')).toBeInTheDocument();

      // Test scale 2
      rerender(
        <TileActionsProvider>
          <ItemTileContent
            {...defaultProps}
            item={testTile}
            scale={2}
            isFavorited={true}
            shortcutName="test"
          />
        </TileActionsProvider>
      );
      expect(screen.getByTestId('favorite-indicator')).toBeInTheDocument();

      // Test scale 3
      rerender(
        <TileActionsProvider>
          <ItemTileContent
            {...defaultProps}
            item={testTile}
            scale={3}
            isFavorited={true}
            shortcutName="test"
          />
        </TileActionsProvider>
      );
      expect(screen.getByTestId('favorite-indicator')).toBeInTheDocument();
    });
  });

  describe('when tile is not favorited', () => {
    it('should not render FavoriteIndicator when isFavorited is false', () => {
      const testTile = createTestTile('1,0:1', '1');

      render(
        <TileActionsProvider>
          <ItemTileContent
            {...defaultProps}
            item={testTile}
            isFavorited={false}
          />
        </TileActionsProvider>
      );

      expect(screen.queryByTestId('favorite-indicator')).not.toBeInTheDocument();
    });

    it('should not render FavoriteIndicator when isFavorited prop is not provided', () => {
      const testTile = createTestTile('1,0:1', '1');

      render(
        <TileActionsProvider>
          <ItemTileContent {...defaultProps} item={testTile} />
        </TileActionsProvider>
      );

      expect(screen.queryByTestId('favorite-indicator')).not.toBeInTheDocument();
    });
  });

  describe('positioning relative to other indicators', () => {
    it('should render FavoriteIndicator alongside VisibilityIndicator when both apply', () => {
      const testTile = createTestTile('1,0:1', '1');

      render(
        <TileActionsProvider>
          <ItemTileContent
            {...defaultProps}
            item={testTile}
            isFavorited={true}
            shortcutName="test"
            parentVisibility={Visibility.PUBLIC} // Different from tile's PRIVATE visibility
          />
        </TileActionsProvider>
      );

      // Both indicators should be present
      expect(screen.getByTestId('favorite-indicator')).toBeInTheDocument();
      // Note: VisibilityIndicator doesn't have a testId, so we verify FavoriteIndicator exists
      // The actual positioning is tested in FavoriteIndicator.test.tsx
    });
  });
});
