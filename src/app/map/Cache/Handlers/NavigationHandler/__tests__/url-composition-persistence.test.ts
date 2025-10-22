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
    test('should include composition=true in URL when expanded', () => {
      const url = buildMapUrl('123', ['1', '2'], true);

      expect(url).toContain('center=123');
      expect(url).toContain('expandedItems=1%2C2');
      expect(url).toContain('composition=true');
    });

    test('should omit composition parameter when false', () => {
      const url = buildMapUrl('123', ['1'], false);

      expect(url).toContain('center=123');
      expect(url).toContain('expandedItems=1');
      expect(url).not.toContain('composition=');
    });

    test('should omit composition parameter when undefined', () => {
      const url = buildMapUrl('123', ['1']);

      expect(url).toContain('center=123');
      expect(url).toContain('expandedItems=1');
      expect(url).not.toContain('composition=');
    });
  });

  describe('getMapContext', () => {
    test('should extract isCompositionExpanded=true from URL', () => {
      const searchParams = new URLSearchParams('?center=123&expandedItems=1,2&composition=true');
      const context = getMapContext('/map', searchParams);

      expect(context.centerItemId).toBe('123');
      expect(context.expandedItems).toEqual(['1', '2']);
      expect(context.isCompositionExpanded).toBe(true);
    });

    test('should return false when composition parameter is missing', () => {
      const searchParams = new URLSearchParams('?center=123&expandedItems=1,2');
      const context = getMapContext('/map', searchParams);

      expect(context.isCompositionExpanded).toBe(false);
    });

    test('should return false when composition parameter is not "true"', () => {
      const searchParams = new URLSearchParams('?center=123&composition=false');
      const context = getMapContext('/map', searchParams);

      expect(context.isCompositionExpanded).toBe(false);
    });

    test('should return false when composition parameter is empty', () => {
      const searchParams = new URLSearchParams('?center=123&composition=');
      const context = getMapContext('/map', searchParams);

      expect(context.isCompositionExpanded).toBe(false);
    });
  });

  describe('updateURL', () => {
    test('should update URL with composition=true', () => {
      updateURL('123', ['1', '2'], true);

      expect(window.history.pushState).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('composition=true')
      );
    });

    test('should omit composition parameter when false', () => {
      updateURL('123', ['1'], false);

      const callArg = (window.history.pushState as ReturnType<typeof vi.fn>).mock.calls[0]?.[2] as string;
      expect(callArg).not.toContain('composition=');
    });

    test('should omit composition parameter when undefined', () => {
      updateURL('123', ['1']);

      const callArg = (window.history.pushState as ReturnType<typeof vi.fn>).mock.calls[0]?.[2] as string;
      expect(callArg).not.toContain('composition=');
    });
  });

  describe('syncURLWithState', () => {
    test('should sync isCompositionExpanded=true from state to URL', () => {
      const mockState = {
        currentCenter: '1,0:1',
        expandedItemIds: ['1', '2'],
        isCompositionExpanded: true,
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
        expect.stringContaining('composition=true')
      );
    });

    test('should omit composition when false in state', () => {
      const mockState = {
        currentCenter: '1,0:1',
        expandedItemIds: ['1'],
        isCompositionExpanded: false,
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
      expect(callArg).not.toContain('composition=');
    });
  });

  describe('toggleCompositionExpansionWithURL', () => {
    test('should toggle composition from false to true and update URL', () => {
      const mockDispatch = vi.fn();
      const mockState = {
        currentCenter: '1,0:1',
        expandedItemIds: [],
        isCompositionExpanded: false,
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

      toggleCompositionExpansionWithURL(getState, mockDispatch);

      // Should dispatch toggle action
      expect(mockDispatch).toHaveBeenCalled();

      // Should update URL with composition=true
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('composition=true')
      );
    });

    test('should toggle composition from true to false and remove from URL', () => {
      const mockDispatch = vi.fn();
      const mockState = {
        currentCenter: '1,0:1',
        expandedItemIds: [],
        isCompositionExpanded: true,
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

      toggleCompositionExpansionWithURL(getState, mockDispatch);

      expect(mockDispatch).toHaveBeenCalled();

      // URL should not have composition parameter
      const callArg = (window.history.replaceState as ReturnType<typeof vi.fn>).mock.calls[0]?.[2] as string;
      expect(callArg).not.toContain('composition=');
    });
  });
});
