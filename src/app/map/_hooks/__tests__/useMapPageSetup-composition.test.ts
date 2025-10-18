import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useMapPageSetup } from '../useMapPageSetup';

// Mock dependencies
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('~/commons/trpc/react', () => ({
  api: {
    map: {
      getUserMap: {
        useQuery: vi.fn(() => ({ data: null, isLoading: false })),
      },
    },
  },
}));

vi.mock('~/contexts/UnifiedAuthContext', () => ({
  useUnifiedAuth: vi.fn(() => ({ mappingUserId: 1, isLoading: false })),
}));

vi.mock('~/app/map/MapResolver', () => ({
  useMapResolver: vi.fn((center: string) => ({
    centerCoordinate: center || '1,0:',
    rootItemId: 1,
    isLoading: false,
    error: null,
  })),
}));

vi.mock('~/app/map', () => ({
  loadPreFetchedData: vi.fn(() => null),
  clearPreFetchedData: vi.fn(),
  EventBus: vi.fn(() => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

describe('useMapPageSetup - Composition Integration', () => {
  const createWrapper = () => {
    const Wrapper = ({ children }: { children: ReactNode }) => {
      return <>{children}</>;
    };
    return Wrapper;
  };

  describe('compositionExpandedIds parsing from URL', () => {
    it('should parse compositionExpandedIds from ce parameter', async () => {
      const searchParams = Promise.resolve({
        center: '123',
        ce: '1,0:1|1,0:2',
      });

      const { result } = renderHook(
        () => useMapPageSetup({ searchParams }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.cacheProviderProps.initialCompositionExpandedIds).toEqual([
        '1,0:1',
        '1,0:2',
      ]);
    });

    it('should return empty array when ce parameter is missing', async () => {
      const searchParams = Promise.resolve({
        center: '123',
        expandedItems: '1,2',
      });

      const { result } = renderHook(
        () => useMapPageSetup({ searchParams }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.cacheProviderProps.initialCompositionExpandedIds).toEqual([]);
    });

    it('should handle empty ce parameter', async () => {
      const searchParams = Promise.resolve({
        center: '123',
        ce: '',
      });

      const { result } = renderHook(
        () => useMapPageSetup({ searchParams }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.cacheProviderProps.initialCompositionExpandedIds).toEqual([]);
    });

    it('should filter out empty strings from ce parameter', async () => {
      const searchParams = Promise.resolve({
        center: '123',
        ce: '1,0:1||1,0:2',
      });

      const { result } = renderHook(
        () => useMapPageSetup({ searchParams }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.cacheProviderProps.initialCompositionExpandedIds).toEqual([
        '1,0:1',
        '1,0:2',
      ]);
    });

    it('should handle special characters in composition IDs (coordIds)', async () => {
      const searchParams = Promise.resolve({
        center: '123',
        ce: '1,0:2,3|2,1:4,5',
      });

      const { result } = renderHook(
        () => useMapPageSetup({ searchParams }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.cacheProviderProps.initialCompositionExpandedIds).toEqual([
        '1,0:2,3',
        '2,1:4,5',
      ]);
    });
  });

  describe('initialCompositionExpandedIds in cacheProviderProps', () => {
    it('should include initialCompositionExpandedIds in cache provider props', async () => {
      const searchParams = Promise.resolve({
        center: '123',
        ce: '1,0:1',
      });

      const { result } = renderHook(
        () => useMapPageSetup({ searchParams }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.cacheProviderProps).toHaveProperty('initialCompositionExpandedIds');
      expect(Array.isArray(result.current.cacheProviderProps.initialCompositionExpandedIds)).toBe(
        true
      );
    });

    it('should preserve other cache provider props when adding composition support', async () => {
      const searchParams = Promise.resolve({
        center: '123',
        expandedItems: '1,2',
        ce: '1,0:1',
      });

      const { result } = renderHook(
        () => useMapPageSetup({ searchParams }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      const props = result.current.cacheProviderProps;

      expect(props).toHaveProperty('initialItems');
      expect(props).toHaveProperty('initialCenter');
      expect(props).toHaveProperty('initialExpandedItems');
      expect(props).toHaveProperty('initialCompositionExpandedIds');
      expect(props).toHaveProperty('mapContext');
      expect(props).toHaveProperty('cacheConfig');
      expect(props).toHaveProperty('eventBus');
    });
  });
});
