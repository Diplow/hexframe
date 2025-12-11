import '~/test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFavoritesAutocomplete } from '~/app/map/Chat/Input/_hooks/autocomplete/use-favorites-autocomplete';
import type { Favorite } from '~/lib/domains/iam/_repositories/favorites.repository';

// Mock the favorites data fetching (will be implemented with tRPC or similar)
vi.mock('~/commons/trpc/react', () => ({
  api: {
    iam: {
      favorites: {
        list: {
          useQuery: vi.fn(() => ({
            data: [],
            isLoading: false,
            error: null,
          })),
        },
      },
    },
  },
}));

// Helper to create mock favorites
function createMockFavorite(
  shortcutName: string,
  mapItemId = `item-${shortcutName}`
): Favorite {
  return {
    id: `fav-${shortcutName}`,
    userId: 'user-123',
    mapItemId,
    shortcutName,
    createdAt: new Date(),
  };
}

describe('useFavoritesAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return empty suggestions when input does not start with @', () => {
      const mockFavorites = [
        createMockFavorite('plan'),
        createMockFavorite('project'),
      ];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('regular text');
      });

      expect(result.current.suggestions).toEqual([]);
    });

    it('should return all favorites when only @ is typed', () => {
      const mockFavorites = [
        createMockFavorite('plan'),
        createMockFavorite('project'),
        createMockFavorite('review'),
      ];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@');
      });

      expect(result.current.suggestions).toHaveLength(3);
    });

    it('should filter favorites by prefix after @', () => {
      const mockFavorites = [
        createMockFavorite('plan'),
        createMockFavorite('project'),
        createMockFavorite('review'),
      ];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@p');
      });

      expect(result.current.suggestions).toHaveLength(2);
      expect(result.current.suggestions.map(s => s.shortcutName)).toEqual(
        expect.arrayContaining(['plan', 'project'])
      );
    });

    it('should return single match for exact prefix', () => {
      const mockFavorites = [
        createMockFavorite('plan'),
        createMockFavorite('project'),
      ];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@pla');
      });

      expect(result.current.suggestions).toHaveLength(1);
      expect(result.current.suggestions[0]?.shortcutName).toBe('plan');
    });

    it('should return empty when no favorites match', () => {
      const mockFavorites = [
        createMockFavorite('plan'),
        createMockFavorite('project'),
      ];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@xyz');
      });

      expect(result.current.suggestions).toEqual([]);
    });
  });

  describe('case insensitivity', () => {
    it('should match case-insensitively', () => {
      const mockFavorites = [createMockFavorite('myproject')];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@MYPROJ');
      });

      expect(result.current.suggestions).toHaveLength(1);
      expect(result.current.suggestions[0]?.shortcutName).toBe('myproject');
    });

    it('should handle mixed case queries', () => {
      const mockFavorites = [createMockFavorite('myproject')];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@MyProj');
      });

      expect(result.current.suggestions).toHaveLength(1);
    });
  });

  describe('selection', () => {
    it('should have selectedIndex starting at 0', () => {
      const mockFavorites = [
        createMockFavorite('plan'),
        createMockFavorite('project'),
      ];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@');
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it('should navigate down through suggestions', () => {
      const mockFavorites = [
        createMockFavorite('plan'),
        createMockFavorite('project'),
        createMockFavorite('review'),
      ];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@');
      });

      act(() => {
        result.current.navigateDown();
      });

      expect(result.current.selectedIndex).toBe(1);
    });

    it('should navigate up through suggestions', () => {
      const mockFavorites = [
        createMockFavorite('plan'),
        createMockFavorite('project'),
      ];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@');
        result.current.navigateDown();
        result.current.navigateUp();
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it('should wrap around when navigating down past last item', () => {
      const mockFavorites = [
        createMockFavorite('plan'),
        createMockFavorite('project'),
      ];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@');
        result.current.navigateDown();
        result.current.navigateDown();
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it('should wrap around when navigating up from first item', () => {
      const mockFavorites = [
        createMockFavorite('plan'),
        createMockFavorite('project'),
      ];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@');
        result.current.navigateUp();
      });

      expect(result.current.selectedIndex).toBe(1);
    });

    it('should return selected favorite', () => {
      const mockFavorites = [
        createMockFavorite('plan'),
        createMockFavorite('project'),
      ];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@');
        result.current.navigateDown();
      });

      const selected = result.current.getSelectedFavorite();
      expect(selected?.shortcutName).toBe('project');
    });

    it('should reset selection when query changes', () => {
      const mockFavorites = [
        createMockFavorite('plan'),
        createMockFavorite('project'),
      ];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@');
        result.current.navigateDown();
        result.current.navigateDown();
      });

      act(() => {
        result.current.updateQuery('@p');
      });

      expect(result.current.selectedIndex).toBe(0);
    });
  });

  describe('isActive state', () => {
    it('should be inactive initially', () => {
      const mockFavorites = [createMockFavorite('plan')];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      expect(result.current.isActive).toBe(false);
    });

    it('should become active when @ is typed', () => {
      const mockFavorites = [createMockFavorite('plan')];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@');
      });

      expect(result.current.isActive).toBe(true);
    });

    it('should become inactive when query is cleared', () => {
      const mockFavorites = [createMockFavorite('plan')];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@');
      });

      act(() => {
        result.current.updateQuery('');
      });

      expect(result.current.isActive).toBe(false);
    });

    it('should have close method to deactivate', () => {
      const mockFavorites = [createMockFavorite('plan')];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@');
      });

      act(() => {
        result.current.close();
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('current mention detection', () => {
    it('should detect @ position in middle of text', () => {
      const mockFavorites = [createMockFavorite('plan')];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      // Simulating cursor at position after "@p" in "hello @p world"
      act(() => {
        result.current.updateQueryWithCursor('hello @p world', 9);
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.suggestions).toHaveLength(1);
    });

    it('should not activate when @ is part of email', () => {
      const mockFavorites = [createMockFavorite('example')];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      // Cursor after the @ in email - should not activate
      act(() => {
        result.current.updateQueryWithCursor('email test@example.com', 11);
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('empty favorites list', () => {
    it('should return empty suggestions with empty favorites', () => {
      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: [] })
      );

      act(() => {
        result.current.updateQuery('@');
      });

      expect(result.current.suggestions).toEqual([]);
    });
  });

  describe('FavoriteMatch type', () => {
    it('should include favorite data in suggestions', () => {
      const mockFavorites = [createMockFavorite('plan', 'item-123')];

      const { result } = renderHook(() =>
        useFavoritesAutocomplete({ favorites: mockFavorites })
      );

      act(() => {
        result.current.updateQuery('@');
      });

      const suggestion = result.current.suggestions[0];
      expect(suggestion).toMatchObject({
        shortcutName: 'plan',
        mapItemId: 'item-123',
      });
    });
  });
});
