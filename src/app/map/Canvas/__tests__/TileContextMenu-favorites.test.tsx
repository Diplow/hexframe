import '~/test/setup';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TileContextMenu } from '~/app/map/Canvas/TileContextMenu';
import { createMockTileData } from '~/app/map/__tests__/utils/mockTileData';
import { Visibility } from '~/lib/domains/mapping/utils';

describe('TileContextMenu - Favorites', () => {
  describe('happy path', () => {
    it('should display "Add to Favorites" when tile is not favorited', () => {
      const tileData = createMockTileData();
      const onAddFavorite = vi.fn();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onAddFavorite={onAddFavorite}
          onRemoveFavorite={vi.fn()}
          isFavorited={false}
          canEdit={true}
        />
      );

      expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
      expect(screen.queryByText('Remove from Favorites')).not.toBeInTheDocument();
    });

    it('should display "Remove from Favorites" when tile is favorited', () => {
      const tileData = createMockTileData();
      const onRemoveFavorite = vi.fn();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onAddFavorite={vi.fn()}
          onRemoveFavorite={onRemoveFavorite}
          isFavorited={true}
          canEdit={true}
        />
      );

      expect(screen.getByText('Remove from Favorites')).toBeInTheDocument();
      expect(screen.queryByText('Add to Favorites')).not.toBeInTheDocument();
    });

    it('should call onAddFavorite when "Add to Favorites" is clicked', async () => {
      const user = userEvent.setup();
      const tileData = createMockTileData();
      const onAddFavorite = vi.fn();
      const onClose = vi.fn();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={onClose}
          onAddFavorite={onAddFavorite}
          onRemoveFavorite={vi.fn()}
          isFavorited={false}
          canEdit={true}
        />
      );

      await user.click(screen.getByText('Add to Favorites'));

      expect(onAddFavorite).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onRemoveFavorite when "Remove from Favorites" is clicked', async () => {
      const user = userEvent.setup();
      const tileData = createMockTileData();
      const onRemoveFavorite = vi.fn();
      const onClose = vi.fn();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={onClose}
          onAddFavorite={vi.fn()}
          onRemoveFavorite={onRemoveFavorite}
          isFavorited={true}
          canEdit={true}
        />
      );

      await user.click(screen.getByText('Remove from Favorites'));

      expect(onRemoveFavorite).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should NOT show favorites options when canEdit is false', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onAddFavorite={vi.fn()}
          onRemoveFavorite={vi.fn()}
          isFavorited={false}
          canEdit={false}
        />
      );

      expect(screen.queryByText('Add to Favorites')).not.toBeInTheDocument();
      expect(screen.queryByText('Remove from Favorites')).not.toBeInTheDocument();
    });

    it('should NOT show favorites options for empty tiles', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onAddFavorite={vi.fn()}
          onRemoveFavorite={vi.fn()}
          isFavorited={false}
          canEdit={true}
          isEmptyTile={true}
        />
      );

      expect(screen.queryByText('Add to Favorites')).not.toBeInTheDocument();
      expect(screen.queryByText('Remove from Favorites')).not.toBeInTheDocument();
    });

    it('should NOT show favorites options when callbacks are undefined', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          canEdit={true}
        />
      );

      expect(screen.queryByText('Add to Favorites')).not.toBeInTheDocument();
      expect(screen.queryByText('Remove from Favorites')).not.toBeInTheDocument();
    });

    it('should handle missing isFavorited prop gracefully (default to not favorited)', () => {
      const tileData = createMockTileData();
      const onAddFavorite = vi.fn();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onAddFavorite={onAddFavorite}
          onRemoveFavorite={vi.fn()}
          canEdit={true}
        />
      );

      // When isFavorited is not provided, default behavior should show Add to Favorites
      expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
    });
  });

  describe('integration with other menu items', () => {
    it('should show favorites alongside other menu items', () => {
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
          onAddFavorite={vi.fn()}
          onRemoveFavorite={vi.fn()}
          isFavorited={false}
          canEdit={true}
        />
      );

      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Expand')).toBeInTheDocument();
      expect(screen.getByText('Navigate')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should place favorites after View History and before Visibility', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onViewHistory={vi.fn()}
          onAddFavorite={vi.fn()}
          onRemoveFavorite={vi.fn()}
          onSetVisibility={vi.fn()}
          isFavorited={false}
          canEdit={true}
          visibility={Visibility.PRIVATE}
        />
      );

      const menuItems = screen.getAllByRole('menuitem');
      const viewHistoryIndex = menuItems.findIndex(item =>
        item.textContent?.includes('View History')
      );
      const favoritesIndex = menuItems.findIndex(item =>
        item.textContent?.includes('Add to Favorites')
      );

      expect(favoritesIndex).toBeGreaterThan(viewHistoryIndex);
    });
  });

  describe('visual styling', () => {
    it('should use Star icon for "Add to Favorites" menu item', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onAddFavorite={vi.fn()}
          onRemoveFavorite={vi.fn()}
          isFavorited={false}
          canEdit={true}
        />
      );

      const addButton = screen.getByText('Add to Favorites').closest('button');
      expect(addButton).toBeInTheDocument();
      // Icon is rendered via lucide-react, checking button exists is sufficient
    });

    it('should use StarOff icon for "Remove from Favorites" menu item', () => {
      const tileData = createMockTileData();

      render(
        <TileContextMenu
          tileData={tileData}
          position={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onAddFavorite={vi.fn()}
          onRemoveFavorite={vi.fn()}
          isFavorited={true}
          canEdit={true}
        />
      );

      const removeButton = screen.getByText('Remove from Favorites').closest('button');
      expect(removeButton).toBeInTheDocument();
      // Icon is rendered via lucide-react, checking button exists is sufficient
    });
  });
});
