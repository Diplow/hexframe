import '~/test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useFavoritesPanel } from '~/app/map/Favorites/_hooks/use-favorites-panel';
import { createTestSetup } from '~/app/test-utils/providers';

/**
 * Test suite for useFavoritesPanel hook
 *
 * This hook manages:
 * - Loading favorites from API
 * - Fetching tile data for favorites
 * - Search/filter state
 * - Sort order state
 * - Panel collapse/expand state
 * - Navigation to favorites
 * - Removing favorites
 */
describe('useFavoritesPanel', () => {
  const mockFavorites = [
    {
      id: 'fav-1',
      shortcutName: 'project_plan',
      mapItemId: 1,
      userId: 'user-1',
      createdAt: new Date('2024-01-15'),
    },
    {
      id: 'fav-2',
      shortcutName: 'review_checklist',
      mapItemId: 2,
      userId: 'user-1',
      createdAt: new Date('2024-01-10'),
    },
    {
      id: 'fav-3',
      shortcutName: 'daily_tasks',
      mapItemId: 3,
      userId: 'user-1',
      createdAt: new Date('2024-01-20'),
    },
  ];

  const mockTileData = {
    1: { title: 'Project Plan', preview: 'Q1 planning overview' },
    2: { title: 'Review Checklist', preview: 'Code review standards' },
    3: { title: 'Daily Tasks', preview: 'Morning routine tasks' },
  };

  let testSetup: ReturnType<typeof createTestSetup>;

  beforeEach(() => {
    testSetup = createTestSetup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('initialization', () => {
    it('should return initial state with empty favorites', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      expect(result.current.favorites).toEqual([]);
      expect(result.current.tileData).toEqual({});
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should load favorites on mount', async () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should fetch tile data for loaded favorites', async () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      await waitFor(() => {
        expect(result.current.tileData).toBeDefined();
      });
    });
  });

  describe('search/filter state', () => {
    it('should initialize with empty search term', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      expect(result.current.searchTerm).toBe('');
    });

    it('should update search term via setSearchTerm', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      act(() => {
        result.current.setSearchTerm('project');
      });

      expect(result.current.searchTerm).toBe('project');
    });

    it('should return filtered favorites based on search term', async () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      act(() => {
        result.current.setSearchTerm('project');
      });

      expect(result.current.filteredFavorites).toHaveLength(1);
      expect(result.current.filteredFavorites[0]!.shortcutName).toBe('project_plan');
    });

    it('should filter by shortcut name (case-insensitive)', async () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      act(() => {
        result.current.setSearchTerm('DAILY');
      });

      expect(result.current.filteredFavorites).toHaveLength(1);
      expect(result.current.filteredFavorites[0]!.shortcutName).toBe('daily_tasks');
    });

    it('should filter by tile title', async () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      act(() => {
        result.current.setSearchTerm('Review');
      });

      expect(result.current.filteredFavorites).toHaveLength(1);
      expect(result.current.filteredFavorites[0]!.shortcutName).toBe('review_checklist');
    });

    it('should return empty array when search matches nothing', async () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      act(() => {
        result.current.setSearchTerm('nonexistent');
      });

      expect(result.current.filteredFavorites).toHaveLength(0);
    });

    it('should clear filter and return all favorites', async () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      act(() => {
        result.current.setSearchTerm('project');
      });

      expect(result.current.filteredFavorites).toHaveLength(1);

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchTerm).toBe('');
      expect(result.current.filteredFavorites).toHaveLength(3);
    });
  });

  describe('sort order state', () => {
    it('should initialize with name-asc sort order', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      expect(result.current.sortOrder).toBe('name-asc');
    });

    it('should allow setting sort order', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      act(() => {
        result.current.setSortOrder('date-desc');
      });

      expect(result.current.sortOrder).toBe('date-desc');
    });

    it('should sort favorites by name ascending', async () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      act(() => {
        result.current.setSortOrder('name-asc');
      });

      const sortedNames = result.current.sortedFavorites.map((f) => f.shortcutName);
      expect(sortedNames).toEqual(['daily_tasks', 'project_plan', 'review_checklist']);
    });

    it('should sort favorites by name descending', async () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      act(() => {
        result.current.setSortOrder('name-desc');
      });

      const sortedNames = result.current.sortedFavorites.map((f) => f.shortcutName);
      expect(sortedNames).toEqual(['review_checklist', 'project_plan', 'daily_tasks']);
    });

    it('should sort favorites by date newest first', async () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      act(() => {
        result.current.setSortOrder('date-desc');
      });

      const sortedNames = result.current.sortedFavorites.map((f) => f.shortcutName);
      // Jan 20 (daily_tasks), Jan 15 (project_plan), Jan 10 (review_checklist)
      expect(sortedNames).toEqual(['daily_tasks', 'project_plan', 'review_checklist']);
    });

    it('should sort favorites by date oldest first', async () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      act(() => {
        result.current.setSortOrder('date-asc');
      });

      const sortedNames = result.current.sortedFavorites.map((f) => f.shortcutName);
      // Jan 10 (review_checklist), Jan 15 (project_plan), Jan 20 (daily_tasks)
      expect(sortedNames).toEqual(['review_checklist', 'project_plan', 'daily_tasks']);
    });

    it('should persist sort preference to localStorage', async () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      act(() => {
        result.current.setSortOrder('date-desc');
      });

      expect(localStorage.getItem('favorites-sort-order')).toBe('date-desc');
    });

    it('should load sort preference from localStorage on mount', async () => {
      localStorage.setItem('favorites-sort-order', 'date-asc');

      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      expect(result.current.sortOrder).toBe('date-asc');
    });
  });

  describe('panel collapse/expand state', () => {
    it('should initialize with panel expanded', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      expect(result.current.isCollapsed).toBe(false);
    });

    it('should toggle collapsed state', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      act(() => {
        result.current.toggleCollapsed();
      });

      expect(result.current.isCollapsed).toBe(true);

      act(() => {
        result.current.toggleCollapsed();
      });

      expect(result.current.isCollapsed).toBe(false);
    });

    it('should allow setting collapsed state directly', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      act(() => {
        result.current.setIsCollapsed(true);
      });

      expect(result.current.isCollapsed).toBe(true);
    });

    it('should persist collapsed state to localStorage', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      act(() => {
        result.current.setIsCollapsed(true);
      });

      expect(localStorage.getItem('favorites-panel-collapsed')).toBe('true');
    });
  });

  describe('navigation', () => {
    it('should provide navigateToFavorite function', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      expect(typeof result.current.navigateToFavorite).toBe('function');
    });

    it('should emit navigation event when navigating to favorite', async () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      await act(async () => {
        await result.current.navigateToFavorite('item-1');
      });

      testSetup.expectEvent('favorites.navigate', { mapItemId: 'item-1' });
    });

    it('should call onNavigate callback when navigating', async () => {
      const onNavigate = vi.fn();

      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
            onNavigate,
          }),
        { wrapper: testSetup.wrapper }
      );

      await act(async () => {
        await result.current.navigateToFavorite('item-1');
      });

      expect(onNavigate).toHaveBeenCalledWith('item-1');
    });
  });

  describe('remove favorite', () => {
    it('should provide removeFavorite function', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      expect(typeof result.current.removeFavorite).toBe('function');
    });

    it('should call API to remove favorite', async () => {
      const mockRemoveFavorite = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
            removeFavoriteMutation: mockRemoveFavorite,
          }),
        { wrapper: testSetup.wrapper }
      );

      await act(async () => {
        await result.current.removeFavorite('fav-1');
      });

      expect(mockRemoveFavorite).toHaveBeenCalledWith('fav-1');
    });

    it('should optimistically remove favorite from list', async () => {
      const mockRemoveFavorite = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
            removeFavoriteMutation: mockRemoveFavorite,
          }),
        { wrapper: testSetup.wrapper }
      );

      const initialCount = result.current.favorites.length;

      await act(async () => {
        await result.current.removeFavorite('fav-1');
      });

      expect(result.current.favorites).toHaveLength(initialCount - 1);
      expect(result.current.favorites.find((f) => f.id === 'fav-1')).toBeUndefined();
    });

    it('should roll back on error', async () => {
      const mockRemoveFavorite = vi
        .fn()
        .mockRejectedValue(new Error('Remove failed'));

      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
            removeFavoriteMutation: mockRemoveFavorite,
          }),
        { wrapper: testSetup.wrapper }
      );

      const initialCount = result.current.favorites.length;

      await act(async () => {
        try {
          await result.current.removeFavorite('fav-1');
        } catch {
          // Expected to throw
        }
      });

      // Should rollback
      expect(result.current.favorites).toHaveLength(initialCount);
      expect(result.current.favorites.find((f) => f.id === 'fav-1')).toBeDefined();
    });

    it('should emit event when favorite is removed', async () => {
      const mockRemoveFavorite = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
            removeFavoriteMutation: mockRemoveFavorite,
          }),
        { wrapper: testSetup.wrapper }
      );

      await act(async () => {
        await result.current.removeFavorite('fav-1');
      });

      testSetup.expectEvent('favorites.removed', { favoriteId: 'fav-1' });
    });
  });

  describe('refresh favorites', () => {
    it('should provide refreshFavorites function', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      expect(typeof result.current.refreshFavorites).toBe('function');
    });

    it('should set isLoading while refreshing', async () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.refreshFavorites();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should set error state when loading fails', async () => {
      // Test that initialError is properly set
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialError: 'Failed to load favorites',
          }),
        { wrapper: testSetup.wrapper }
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should clear error on successful retry', async () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialError: 'Initial error',
          }),
        { wrapper: testSetup.wrapper }
      );

      expect(result.current.error).toBe('Initial error');

      act(() => {
        result.current.refreshFavorites();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('selected favorite', () => {
    it('should track selected favorite id', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      expect(result.current.selectedFavoriteId).toBeNull();
    });

    it('should update selected favorite', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      act(() => {
        result.current.setSelectedFavoriteId('fav-1');
      });

      expect(result.current.selectedFavoriteId).toBe('fav-1');
    });

    it('should clear selected favorite', () => {
      const { result } = renderHook(() => useFavoritesPanel(), {
        wrapper: testSetup.wrapper,
      });

      act(() => {
        result.current.setSelectedFavoriteId('fav-1');
      });

      act(() => {
        result.current.clearSelectedFavorite();
      });

      expect(result.current.selectedFavoriteId).toBeNull();
    });
  });

  describe('computed values', () => {
    it('should return total count of favorites', () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      expect(result.current.totalCount).toBe(3);
    });

    it('should return filtered count when search is active', () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      act(() => {
        result.current.setSearchTerm('project');
      });

      expect(result.current.filteredCount).toBe(1);
      expect(result.current.totalCount).toBe(3);
    });

    it('should indicate if there are any favorites', () => {
      const { result: resultWithFavorites } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      expect(resultWithFavorites.current.hasFavorites).toBe(true);

      const { result: resultEmpty } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: [],
            initialTileData: {},
          }),
        { wrapper: testSetup.wrapper }
      );

      expect(resultEmpty.current.hasFavorites).toBe(false);
    });

    it('should indicate if search has results', () => {
      const { result } = renderHook(
        () =>
          useFavoritesPanel({
            initialFavorites: mockFavorites,
            initialTileData: mockTileData,
          }),
        { wrapper: testSetup.wrapper }
      );

      act(() => {
        result.current.setSearchTerm('nonexistent');
      });

      expect(result.current.hasSearchResults).toBe(false);
      expect(result.current.isSearchActive).toBe(true);
    });
  });
});
