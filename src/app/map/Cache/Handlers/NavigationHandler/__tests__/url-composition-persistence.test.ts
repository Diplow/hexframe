import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CacheState } from '~/app/map/Cache/State';
import { buildMapUrl } from '~/app/map/Cache/Handlers/NavigationHandler/_core/navigation-core';
import {
  getMapContext,
  updateURL,
  syncURLWithState,
  toggleCompositionExpansionWithURL,
} from '~/app/map/Cache/Handlers/NavigationHandler/_url/navigation-url-handlers';

describe('URL Composition Persistence', () => {
  let originalHistory: History;
  let originalLocation: Location;

  beforeEach(() => {
    // Save originals
    originalHistory = window.history;
    originalLocation = window.location;

    // Mock window.history for all tests
    Object.defineProperty(window, 'history', {
      writable: true,
      configurable: true,
      value: {
        pushState: vi.fn(),
        replaceState: vi.fn(),
      },
    });

    // Mock window.location for all tests
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: {
        origin: 'http://localhost:3000',
        pathname: '/map',
        search: '',
      },
    });
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(window, 'history', {
      writable: true,
      configurable: true,
      value: originalHistory,
    });
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
  });

  describe('buildMapUrl', () => {
    test('should include compositionExpandedIds in URL', () => {
      const url = buildMapUrl('123', ['1', '2'], ['comp1', 'comp2']);

      expect(url).toContain('center=123');
      expect(url).toContain('expandedItems=1%2C2');
      expect(url).toContain('ce=comp1%7Ccomp2'); // %7C is pipe |
    });

    test('should omit ce parameter when compositionExpandedIds is empty', () => {
      const url = buildMapUrl('123', ['1'], []);

      expect(url).toContain('center=123');
      expect(url).toContain('expandedItems=1');
      expect(url).not.toContain('ce=');
    });

    test('should omit expandedItems when empty but include ce when present', () => {
      const url = buildMapUrl('123', [], ['comp1']);

      expect(url).toContain('center=123');
      expect(url).not.toContain('expandedItems=');
      expect(url).toContain('ce=comp1');
    });

    test('should handle special characters in coordIds', () => {
      const url = buildMapUrl('1,0:1', [], ['1,0:2', '1,0:3']);

      expect(url).toContain('center=1%2C0%3A1');
      expect(url).toContain('ce=1%2C0%3A2%7C1%2C0%3A3'); // Pipe separator to avoid comma conflicts
    });
  });

  describe('getMapContext', () => {
    test('should extract compositionExpandedIds from URL', () => {
      const searchParams = new URLSearchParams('?center=123&expandedItems=1,2&ce=comp1|comp2');
      const context = getMapContext('/map', searchParams);

      expect(context.centerItemId).toBe('123');
      expect(context.expandedItems).toEqual(['1', '2']);
      expect(context.compositionExpandedIds).toEqual(['comp1', 'comp2']);
    });

    test('should return empty array when ce parameter is missing', () => {
      const searchParams = new URLSearchParams('?center=123&expandedItems=1,2');
      const context = getMapContext('/map', searchParams);

      expect(context.compositionExpandedIds).toEqual([]);
    });

    test('should handle empty ce parameter', () => {
      const searchParams = new URLSearchParams('?center=123&ce=');
      const context = getMapContext('/map', searchParams);

      expect(context.compositionExpandedIds).toEqual([]);
    });

    test('should filter out empty strings from ce parameter', () => {
      const searchParams = new URLSearchParams('?center=123&ce=comp1||comp2');
      const context = getMapContext('/map', searchParams);

      expect(context.compositionExpandedIds).toEqual(['comp1', 'comp2']);
    });

    test('should decode special characters in composition IDs', () => {
      const searchParams = new URLSearchParams('?center=123&ce=1%2C0%3A2%7C1%2C0%3A3'); // Using pipe separator
      const context = getMapContext('/map', searchParams);

      expect(context.compositionExpandedIds).toEqual(['1,0:2', '1,0:3']);
    });
  });

  describe('updateURL', () => {
    test('should update URL with compositionExpandedIds', () => {
      updateURL('123', ['1', '2'], ['comp1', 'comp2']);

      expect(window.history.pushState).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('ce=comp1%7Ccomp2') // %7C is pipe |
      );
    });

    test('should omit ce parameter when compositionExpandedIds is empty', () => {
      updateURL('123', ['1'], []);

      const callArg = (window.history.pushState as ReturnType<typeof vi.fn>).mock.calls[0]?.[2] as string;
      expect(callArg).not.toContain('ce=');
    });
  });

  describe('syncURLWithState', () => {
    test('should sync compositionExpandedIds from state to URL', () => {
      const mockState = {
        currentCenter: '1,0:1',
        expandedItemIds: ['1', '2'],
        compositionExpandedIds: ['comp1', 'comp2'],
        itemsById: {
          '1,0:1': {
            metadata: {
              dbId: '123',
              coordId: '1,0:1',
            },
          },
        },
        regionMetadata: {},
        isLoading: false,
        error: null,
        lastUpdated: 0,
        cacheConfig: {
          maxAge: 300000,
          backgroundRefreshInterval: 30000,
          enableOptimisticUpdates: true,
          maxDepth: 3,
        },
      } as unknown as CacheState;

      const getState = () => mockState;

      syncURLWithState(getState);

      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('ce=comp1%7Ccomp2') // %7C is pipe |
      );
    });

    test('should omit ce when no compositionExpandedIds in state', () => {
      const mockState = {
        currentCenter: '1,0:1',
        expandedItemIds: ['1'],
        compositionExpandedIds: [],
        itemsById: {
          '1,0:1': {
            metadata: {
              dbId: '123',
              coordId: '1,0:1',
            },
          },
        },
        regionMetadata: {},
        isLoading: false,
        error: null,
        lastUpdated: 0,
        cacheConfig: {
          maxAge: 300000,
          backgroundRefreshInterval: 30000,
          enableOptimisticUpdates: true,
          maxDepth: 3,
        },
      } as unknown as CacheState;

      const getState = () => mockState;

      syncURLWithState(getState);

      const callArg = (window.history.replaceState as ReturnType<typeof vi.fn>).mock.calls[0]?.[2] as string;
      expect(callArg).not.toContain('ce=');
    });
  });

  describe('toggleCompositionExpansionWithURL', () => {
    test('should toggle composition expansion and update URL', () => {
      const mockDispatch = vi.fn();
      const mockState = {
        currentCenter: '1,0:1',
        expandedItemIds: [],
        compositionExpandedIds: ['comp1'],
        itemsById: {
          '1,0:1': {
            metadata: {
              dbId: '123',
              coordId: '1,0:1',
            },
          },
        },
        regionMetadata: {},
        isLoading: false,
        error: null,
        lastUpdated: 0,
        cacheConfig: {
          maxAge: 300000,
          backgroundRefreshInterval: 30000,
          enableOptimisticUpdates: true,
          maxDepth: 3,
        },
      } as unknown as CacheState;

      const getState = () => mockState;

      toggleCompositionExpansionWithURL('comp2', getState, mockDispatch);

      // Should dispatch action
      expect(mockDispatch).toHaveBeenCalled();

      // Should update URL with new composition expansion
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('ce=')
      );
    });

    test('should remove composition expansion from URL when toggling off', () => {
      const mockDispatch = vi.fn();
      const mockState = {
        currentCenter: '1,0:1',
        expandedItemIds: [],
        compositionExpandedIds: ['comp1', 'comp2'],
        itemsById: {
          '1,0:1': {
            metadata: {
              dbId: '123',
              coordId: '1,0:1',
            },
          },
        },
        regionMetadata: {},
        isLoading: false,
        error: null,
        lastUpdated: 0,
        cacheConfig: {
          maxAge: 300000,
          backgroundRefreshInterval: 30000,
          enableOptimisticUpdates: true,
          maxDepth: 3,
        },
      } as unknown as CacheState;

      const getState = () => mockState;

      toggleCompositionExpansionWithURL('comp1', getState, mockDispatch);

      expect(mockDispatch).toHaveBeenCalled();

      // URL should only have comp2 now
      const callArg = (window.history.replaceState as ReturnType<typeof vi.fn>).mock.calls[0]?.[2] as string;
      expect(callArg).toContain('ce=comp2');
      expect(callArg).not.toContain('comp1');
    });
  });
});
