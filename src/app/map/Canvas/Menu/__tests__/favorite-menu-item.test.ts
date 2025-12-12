import '~/test/setup';
import { describe, it, expect, vi } from 'vitest';
import { _buildFavoriteMenuItem } from '~/app/map/Canvas/Menu/_builders/favorite-actions';

describe('_buildFavoriteMenuItem', () => {
  describe('when tile is not favorited', () => {
    it('should return "Add to Favorites" menu item', () => {
      const item = _buildFavoriteMenuItem({
        canEdit: true,
        isFavorited: false,
        onAddFavorite: vi.fn(),
        onRemoveFavorite: vi.fn(),
      });

      expect(item).toHaveLength(1);
      expect(item[0]!.label).toBe('Add to Favorites');
    });

    it('should include star icon for Add to Favorites', () => {
      const item = _buildFavoriteMenuItem({
        canEdit: true,
        isFavorited: false,
        onAddFavorite: vi.fn(),
        onRemoveFavorite: vi.fn(),
      });

      expect(item).toHaveLength(1);
      // The icon should be the Star icon from lucide-react
      expect(item[0]!.icon).toBeDefined();
      expect(item[0]!.icon.displayName ?? item[0]!.icon.name).toContain('Star');
    });

    it('should call onAddFavorite when clicked', () => {
      const onAddFavorite = vi.fn();
      const onRemoveFavorite = vi.fn();

      const item = _buildFavoriteMenuItem({
        canEdit: true,
        isFavorited: false,
        onAddFavorite,
        onRemoveFavorite,
      });

      expect(item).toHaveLength(1);
      item[0]!.onClick?.();

      expect(onAddFavorite).toHaveBeenCalledTimes(1);
      expect(onRemoveFavorite).not.toHaveBeenCalled();
    });
  });

  describe('when tile is favorited', () => {
    it('should return "Remove from Favorites" menu item', () => {
      const item = _buildFavoriteMenuItem({
        canEdit: true,
        isFavorited: true,
        onAddFavorite: vi.fn(),
        onRemoveFavorite: vi.fn(),
      });

      expect(item).toHaveLength(1);
      expect(item[0]!.label).toBe('Remove from Favorites');
    });

    it('should include star-off icon for Remove from Favorites', () => {
      const item = _buildFavoriteMenuItem({
        canEdit: true,
        isFavorited: true,
        onAddFavorite: vi.fn(),
        onRemoveFavorite: vi.fn(),
      });

      expect(item).toHaveLength(1);
      // The icon should be the StarOff icon from lucide-react
      expect(item[0]!.icon).toBeDefined();
      expect(item[0]!.icon.displayName ?? item[0]!.icon.name).toContain('StarOff');
    });

    it('should call onRemoveFavorite when clicked', () => {
      const onAddFavorite = vi.fn();
      const onRemoveFavorite = vi.fn();

      const item = _buildFavoriteMenuItem({
        canEdit: true,
        isFavorited: true,
        onAddFavorite,
        onRemoveFavorite,
      });

      expect(item).toHaveLength(1);
      item[0]!.onClick?.();

      expect(onRemoveFavorite).toHaveBeenCalledTimes(1);
      expect(onAddFavorite).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should return empty array when canEdit is false', () => {
      const item = _buildFavoriteMenuItem({
        canEdit: false,
        isFavorited: false,
        onAddFavorite: vi.fn(),
        onRemoveFavorite: vi.fn(),
      });

      expect(item).toEqual([]);
    });

    it('should return empty array when onAddFavorite is undefined and tile is not favorited', () => {
      const item = _buildFavoriteMenuItem({
        canEdit: true,
        isFavorited: false,
        onRemoveFavorite: vi.fn(),
      });

      expect(item).toEqual([]);
    });

    it('should return empty array when onRemoveFavorite is undefined and tile is favorited', () => {
      const item = _buildFavoriteMenuItem({
        canEdit: true,
        isFavorited: true,
        onAddFavorite: vi.fn(),
      });

      expect(item).toEqual([]);
    });

    it('should return empty array when both callbacks are undefined', () => {
      const item = _buildFavoriteMenuItem({
        canEdit: true,
        isFavorited: false,
      });

      expect(item).toEqual([]);
    });

    it('should handle missing isFavorited by defaulting to not favorited', () => {
      const onAddFavorite = vi.fn();

      const item = _buildFavoriteMenuItem({
        canEdit: true,
        isFavorited: false,
        onAddFavorite,
        onRemoveFavorite: vi.fn(),
      });

      expect(item).toHaveLength(1);
      expect(item[0]!.label).toBe('Add to Favorites');
    });
  });

  describe('menu item properties', () => {
    it('should have empty shortcut for Add to Favorites', () => {
      const item = _buildFavoriteMenuItem({
        canEdit: true,
        isFavorited: false,
        onAddFavorite: vi.fn(),
        onRemoveFavorite: vi.fn(),
      });

      expect(item[0]!.shortcut).toBe('');
    });

    it('should have empty shortcut for Remove from Favorites', () => {
      const item = _buildFavoriteMenuItem({
        canEdit: true,
        isFavorited: true,
        onAddFavorite: vi.fn(),
        onRemoveFavorite: vi.fn(),
      });

      expect(item[0]!.shortcut).toBe('');
    });

    it('should not have separator for Add to Favorites', () => {
      const item = _buildFavoriteMenuItem({
        canEdit: true,
        isFavorited: false,
        onAddFavorite: vi.fn(),
        onRemoveFavorite: vi.fn(),
      });

      expect(item[0]!.separator).toBeUndefined();
    });
  });
});
