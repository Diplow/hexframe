import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInitialCacheState } from '../state-initialization';
import type { TileData } from '~/app/map/types';

describe('State Initialization - Composition Support', () => {
  const mockTileData: TileData = {
    metadata: {
      dbId: '123',
      coordId: '1,0:1',
      depth: 1,
      direction: 1,
      parentCoordId: '1,0:',
      rootDbId: 1,
    },
    data: {
      id: 123,
      title: 'Test Tile',
      content: null,
      preview: null,
      link: null,
      coordinates: { userId: 1, groupId: 0, path: [1] },
      depth: 1,
      parentId: 1,
      itemType: 'item' as const,
      ownerId: 1,
    },
    children: [],
    relationsCache: {
      allChildrenLoaded: false,
      hasChildren: false,
      hasComposition: false,
    },
  };

  describe('useInitialCacheState with composition', () => {
    it('should initialize with compositionExpandedIds from config', () => {
      const { result } = renderHook(() =>
        useInitialCacheState({
          initialItems: { '1,0:1': mockTileData },
          initialCenter: '1,0:1',
          initialExpandedItems: ['1,0:2'],
          initialCompositionExpandedIds: ['1,0:1', '1,0:3'],
          cacheConfig: {},
        })
      );

      expect(result.current.compositionExpandedIds).toEqual(['1,0:1', '1,0:3']);
    });

    it('should default to empty array when initialCompositionExpandedIds not provided', () => {
      const { result } = renderHook(() =>
        useInitialCacheState({
          initialItems: { '1,0:1': mockTileData },
          initialCenter: '1,0:1',
          initialExpandedItems: [],
          cacheConfig: {},
        })
      );

      expect(result.current.compositionExpandedIds).toEqual([]);
    });

    it('should preserve compositionExpandedIds on remount with empty items', () => {
      const { result, rerender } = renderHook(
        ({ config }) => useInitialCacheState(config),
        {
          initialProps: {
            config: {
              initialItems: { '1,0:1': mockTileData },
              initialCenter: '1,0:1',
              initialExpandedItems: [],
              initialCompositionExpandedIds: ['1,0:1'],
              cacheConfig: {},
            },
          },
        }
      );

      expect(result.current.compositionExpandedIds).toEqual(['1,0:1']);

      // Simulate remount with empty items
      rerender({
        config: {
          initialItems: {},
          initialCenter: '1,0:1',
          initialExpandedItems: [],
          initialCompositionExpandedIds: ['1,0:1'],
          cacheConfig: {},
        },
      });

      expect(result.current.compositionExpandedIds).toEqual(['1,0:1']);
    });

    it('should preserve all state properties including compositionExpandedIds', () => {
      const { result } = renderHook(() =>
        useInitialCacheState({
          initialItems: { '1,0:1': mockTileData },
          initialCenter: '1,0:1',
          initialExpandedItems: ['1,0:2'],
          initialCompositionExpandedIds: ['1,0:1'],
          cacheConfig: { maxAge: 5000 },
        })
      );

      expect(result.current).toMatchObject({
        itemsById: { '1,0:1': mockTileData },
        currentCenter: '1,0:1',
        expandedItemIds: ['1,0:2'],
        compositionExpandedIds: ['1,0:1'],
        isLoading: false,
      });
    });

    it('should handle multiple composition expanded IDs', () => {
      const { result } = renderHook(() =>
        useInitialCacheState({
          initialItems: {},
          initialCenter: null,
          initialExpandedItems: [],
          initialCompositionExpandedIds: ['1,0:1', '1,0:2', '1,0:3'],
          cacheConfig: {},
        })
      );

      expect(result.current.compositionExpandedIds).toEqual(['1,0:1', '1,0:2', '1,0:3']);
      expect(result.current.compositionExpandedIds).toHaveLength(3);
    });
  });
});
