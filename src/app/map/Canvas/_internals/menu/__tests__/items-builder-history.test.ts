import '~/test/setup';
import { describe, it, expect, vi } from 'vitest';
import { buildMenuItems } from '~/app/map/Canvas/_internals/menu/items-builder';
import type { TileData } from '~/app/map/types/tile-data';
import { History } from 'lucide-react';

describe('buildMenuItems - History Support', () => {
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
    },
    state: {
      isExpanded: false,
      canExpand: true,
      canEdit: true,
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isDragOver: false,
      isHovering: false,
    },
  };

  describe('View History menu item', () => {
    it('should include View History option when onViewHistory is provided', () => {
      const onViewHistory = vi.fn();

      const items = buildMenuItems({
        tileData: mockTileData,
        canEdit: false,
        isEmptyTile: false,
        isCompositionExpanded: false,
        canShowComposition: false,
        onViewHistory,
      });

      const historyItem = items.find(item => item?.label === 'View History');
      expect(historyItem).toBeDefined();
      expect(historyItem?.icon).toBe(History);
      expect(historyItem?.shortcut).toBe('');
    });

    it('should call onViewHistory when View History is clicked', () => {
      const onViewHistory = vi.fn();

      const items = buildMenuItems({
        tileData: mockTileData,
        canEdit: false,
        isEmptyTile: false,
        isCompositionExpanded: false,
        canShowComposition: false,
        onViewHistory,
      });

      const historyItem = items.find(item => item?.label === 'View History');
      historyItem?.onClick();

      expect(onViewHistory).toHaveBeenCalledTimes(1);
    });

    it('should not include View History when onViewHistory is not provided', () => {
      const items = buildMenuItems({
        tileData: mockTileData,
        canEdit: false,
        isEmptyTile: false,
        isCompositionExpanded: false,
        canShowComposition: false,
      });

      const historyItem = items.find(item => item?.label === 'View History');
      expect(historyItem).toBeUndefined();
    });

    it('should not include View History for empty tiles', () => {
      const onViewHistory = vi.fn();

      const items = buildMenuItems({
        tileData: mockTileData,
        canEdit: true,
        isEmptyTile: true,
        isCompositionExpanded: false,
        canShowComposition: false,
        onViewHistory,
      });

      const historyItem = items.find(item => item?.label === 'View History');
      expect(historyItem).toBeUndefined();
    });

    it('should place View History before Edit action', () => {
      const onViewHistory = vi.fn();
      const onEdit = vi.fn();

      const items = buildMenuItems({
        tileData: mockTileData,
        canEdit: true,
        isEmptyTile: false,
        isCompositionExpanded: false,
        canShowComposition: false,
        onViewHistory,
        onEdit,
      });

      const historyIndex = items.findIndex(item => item?.label === 'View History');
      const editIndex = items.findIndex(item => item?.label === 'Edit');

      expect(historyIndex).toBeGreaterThan(-1);
      expect(editIndex).toBeGreaterThan(-1);
      expect(historyIndex).toBeLessThan(editIndex);
    });
  });
});
