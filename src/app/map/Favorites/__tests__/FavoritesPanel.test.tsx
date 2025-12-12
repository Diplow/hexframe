import '~/test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavoritesPanel } from '~/app/map/Favorites/FavoritesPanel';
import { TestProviders } from '~/app/test-utils/providers';
import { createMockEventBus } from '~/test-utils/event-bus';

/**
 * Test suite for FavoritesPanel component
 *
 * The FavoritesPanel displays a list of user's favorited tiles with:
 * - Search/filter functionality
 * - Click to navigate to tile
 * - Remove from favorites
 * - User-selectable sort order
 */
describe('FavoritesPanel', () => {
  let mockEventBus: ReturnType<typeof createMockEventBus>;

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

  // Mock tile data that matches the favorites (keyed by mapItemId number)
  const mockTileData = {
    1: { title: 'Project Plan', preview: 'Q1 planning overview' },
    2: { title: 'Review Checklist', preview: 'Code review standards' },
    3: { title: 'Daily Tasks', preview: 'Morning routine tasks' },
  };

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering favorites list', () => {
    it('should render the panel header with title', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    it('should render list of favorites with shortcut names prefixed with @', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      expect(screen.getByText('@project_plan')).toBeInTheDocument();
      expect(screen.getByText('@review_checklist')).toBeInTheDocument();
      expect(screen.getByText('@daily_tasks')).toBeInTheDocument();
    });

    it('should display tile titles alongside shortcut names', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      expect(screen.getByText('Project Plan')).toBeInTheDocument();
      expect(screen.getByText('Review Checklist')).toBeInTheDocument();
      expect(screen.getByText('Daily Tasks')).toBeInTheDocument();
    });

    it('should display tile previews when available', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      expect(screen.getByText('Q1 planning overview')).toBeInTheDocument();
      expect(screen.getByText('Code review standards')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no favorites exist', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={[]} tileData={{}} />
        </TestProviders>
      );

      expect(screen.getByText(/no favorites/i)).toBeInTheDocument();
    });

    it('should display helpful message about adding favorites', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={[]} tileData={{}} />
        </TestProviders>
      );

      expect(screen.getByText(/right-click on a tile/i)).toBeInTheDocument();
    });
  });

  describe('search/filter functionality', () => {
    it('should render a search input field', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      expect(screen.getByPlaceholderText(/search favorites/i)).toBeInTheDocument();
    });

    it('should filter favorites by shortcut name', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText(/search favorites/i);
      await user.type(searchInput, 'project');

      await waitFor(() => {
        expect(screen.getByText('@project_plan')).toBeInTheDocument();
        expect(screen.queryByText('@review_checklist')).not.toBeInTheDocument();
        expect(screen.queryByText('@daily_tasks')).not.toBeInTheDocument();
      });
    });

    it('should filter favorites by tile title', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText(/search favorites/i);
      await user.type(searchInput, 'Review');

      await waitFor(() => {
        expect(screen.getByText('@review_checklist')).toBeInTheDocument();
        expect(screen.queryByText('@project_plan')).not.toBeInTheDocument();
      });
    });

    it('should be case-insensitive when filtering', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText(/search favorites/i);
      await user.type(searchInput, 'DAILY');

      await waitFor(() => {
        expect(screen.getByText('@daily_tasks')).toBeInTheDocument();
      });
    });

    it('should show "no results" when search matches nothing', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText(/search favorites/i);
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/no matching favorites/i)).toBeInTheDocument();
      });
    });

    it('should clear filter when search is cleared', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      const searchInput = screen.getByPlaceholderText(/search favorites/i);
      await user.type(searchInput, 'project');

      await waitFor(() => {
        expect(screen.queryByText('@review_checklist')).not.toBeInTheDocument();
      });

      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText('@project_plan')).toBeInTheDocument();
        expect(screen.getByText('@review_checklist')).toBeInTheDocument();
        expect(screen.getByText('@daily_tasks')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('should call onNavigate when a favorite content area is clicked', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel
            favorites={mockFavorites}
            tileData={mockTileData}
            onNavigate={onNavigate}
          />
        </TestProviders>
      );

      // Click the "Navigate to tile" button (content area), not the shortcut
      // The shortcut (@name) is for inserting into chat, not navigation
      // List is sorted A-Z by default, so first item is daily_tasks (item-3)
      const navigateButtons = screen.getAllByRole('button', { name: /navigate to tile/i });
      await user.click(navigateButtons[0]!);

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith('item-3');
    });

    it('should emit navigation event via event bus when navigating', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      // Click the "Navigate to tile" button (content area), not the shortcut
      // List is sorted A-Z by default, so first item is daily_tasks (fav-3, item-3)
      const navigateButton = screen.getAllByRole('button', { name: /navigate to tile/i })[0];
      await user.click(navigateButton!);

      await waitFor(() => {
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'favorites.navigate',
            payload: expect.objectContaining({
              mapItemId: 'item-3',
            }) as unknown,
          })
        );
      });
    });

    it('should show visual feedback when hovering over a favorite', async () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      const favoriteItem = screen.getByTestId('favorite-item-fav-1');

      // Check that hover styles are applied via Tailwind classes
      expect(favoriteItem).toHaveClass('hover:bg-neutral-100', 'dark:hover:bg-neutral-800');
    });
  });

  describe('remove from favorites', () => {
    it('should show remove button on each favorite item', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      expect(removeButtons).toHaveLength(3);
    });

    it('should call onRemove when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel
            favorites={mockFavorites}
            tileData={mockTileData}
            onRemove={onRemove}
          />
        </TestProviders>
      );

      // List is sorted A-Z by default, so first item is daily_tasks (fav-3)
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]!);

      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove).toHaveBeenCalledWith('fav-3');
    });

    it('should NOT trigger navigation when clicking remove button', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      const onRemove = vi.fn();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel
            favorites={mockFavorites}
            tileData={mockTileData}
            onNavigate={onNavigate}
            onRemove={onRemove}
          />
        </TestProviders>
      );

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]!);

      expect(onRemove).toHaveBeenCalled();
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog before removing', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel
            favorites={mockFavorites}
            tileData={mockTileData}
            confirmOnRemove={true}
          />
        </TestProviders>
      );

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]!);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });
    });
  });

  describe('sorting', () => {
    it('should render sort dropdown', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      expect(screen.getByRole('combobox', { name: /sort/i })).toBeInTheDocument();
    });

    it('should sort by name (A-Z) by default', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      const items = screen.getAllByTestId(/^favorite-item-fav-/);
      // Alphabetically: daily_tasks, project_plan, review_checklist
      expect(items[0]).toHaveTextContent('@daily_tasks');
      expect(items[1]).toHaveTextContent('@project_plan');
      expect(items[2]).toHaveTextContent('@review_checklist');
    });

    it('should allow sorting by name (Z-A)', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      const sortSelect = screen.getByRole('combobox', { name: /sort/i });
      await user.selectOptions(sortSelect, 'name-desc');

      const items = screen.getAllByTestId(/^favorite-item-fav-/);
      // Reverse alphabetical: review_checklist, project_plan, daily_tasks
      expect(items[0]).toHaveTextContent('@review_checklist');
      expect(items[1]).toHaveTextContent('@project_plan');
      expect(items[2]).toHaveTextContent('@daily_tasks');
    });

    it('should allow sorting by date (newest first)', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      const sortSelect = screen.getByRole('combobox', { name: /sort/i });
      await user.selectOptions(sortSelect, 'date-desc');

      const items = screen.getAllByTestId(/^favorite-item-fav-/);
      // By date newest: daily_tasks (Jan 20), project_plan (Jan 15), review_checklist (Jan 10)
      expect(items[0]).toHaveTextContent('@daily_tasks');
      expect(items[1]).toHaveTextContent('@project_plan');
      expect(items[2]).toHaveTextContent('@review_checklist');
    });

    it('should allow sorting by date (oldest first)', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      const sortSelect = screen.getByRole('combobox', { name: /sort/i });
      await user.selectOptions(sortSelect, 'date-asc');

      const items = screen.getAllByTestId(/^favorite-item-fav-/);
      // By date oldest: review_checklist (Jan 10), project_plan (Jan 15), daily_tasks (Jan 20)
      expect(items[0]).toHaveTextContent('@review_checklist');
      expect(items[1]).toHaveTextContent('@project_plan');
      expect(items[2]).toHaveTextContent('@daily_tasks');
    });

    it('should persist sort preference', async () => {
      const user = userEvent.setup();
      const onSortChange = vi.fn();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel
            favorites={mockFavorites}
            tileData={mockTileData}
            onSortChange={onSortChange}
          />
        </TestProviders>
      );

      const sortSelect = screen.getByRole('combobox', { name: /sort/i });
      await user.selectOptions(sortSelect, 'date-desc');

      expect(onSortChange).toHaveBeenCalledWith('date-desc');
    });
  });

  describe('loading state', () => {
    it('should show loading skeleton when isLoading is true', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={[]} tileData={{}} isLoading={true} />
        </TestProviders>
      );

      expect(screen.getByTestId('favorites-loading')).toBeInTheDocument();
    });

    it('should not show empty state when loading', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={[]} tileData={{}} isLoading={true} />
        </TestProviders>
      );

      expect(screen.queryByText(/no favorites/i)).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel
            favorites={[]}
            tileData={{}}
            error="Failed to load favorites"
          />
        </TestProviders>
      );

      expect(screen.getByText(/failed to load favorites/i)).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel
            favorites={[]}
            tileData={{}}
            error="Failed to load favorites"
          />
        </TestProviders>
      );

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel
            favorites={[]}
            tileData={{}}
            error="Failed to load favorites"
            onRetry={onRetry}
          />
        </TestProviders>
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      expect(screen.getByRole('region', { name: /favorites/i })).toBeInTheDocument();
      expect(screen.getByRole('list', { name: /favorites list/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel
            favorites={mockFavorites}
            tileData={mockTileData}
            onNavigate={onNavigate}
          />
        </TestProviders>
      );

      // Navigate buttons are inside list items - focus the first navigate button
      const navigateButtons = screen.getAllByRole('button', { name: /navigate to tile/i });
      navigateButtons[0]!.focus();
      await user.keyboard('{Enter}');

      expect(onNavigate).toHaveBeenCalled();
    });
  });

  describe('panel collapse/expand', () => {
    it('should have collapse button', () => {
      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
    });

    it('should toggle collapsed state when collapse button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestProviders mockEventBus={mockEventBus}>
          <FavoritesPanel favorites={mockFavorites} tileData={mockTileData} />
        </TestProviders>
      );

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      await user.click(collapseButton);

      expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
      expect(screen.queryByText('@project_plan')).not.toBeInTheDocument();
    });
  });
});
