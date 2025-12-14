import '~/test/setup';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FavoriteListItem } from '~/app/map/Favorites/FavoriteListItem';
import { TestProviders } from '~/app/test-utils/providers';

/**
 * Test suite for FavoriteListItem component
 *
 * Individual list item displaying:
 * - Clickable @shortcut that inserts into chat
 * - Tile title and preview (clickable to navigate)
 * - Edit shortcut button
 * - Remove from favorites button
 */
describe('FavoriteListItem', () => {
  const mockFavorite = {
    id: 'fav-1',
    shortcutName: 'project_plan',
    mapItemId: 1,
    userId: 'user-1',
    createdAt: new Date('2024-01-15'),
    coordId: 'user-1,0:1,2', // Enriched favorite with coord for navigation
  };

  const mockTileData = {
    title: 'Project Plan',
    preview: 'Q1 planning overview for the team',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('should display shortcut name with @ prefix', () => {
      render(
        <TestProviders>
          <FavoriteListItem favorite={mockFavorite} tileData={mockTileData} />
        </TestProviders>
      );

      expect(screen.getByText('@project_plan')).toBeInTheDocument();
    });

    it('should display tile title', () => {
      render(
        <TestProviders>
          <FavoriteListItem favorite={mockFavorite} tileData={mockTileData} />
        </TestProviders>
      );

      expect(screen.getByText('Project Plan')).toBeInTheDocument();
    });

    it('should display tile preview when available', () => {
      render(
        <TestProviders>
          <FavoriteListItem favorite={mockFavorite} tileData={mockTileData} />
        </TestProviders>
      );

      expect(screen.getByText('Q1 planning overview for the team')).toBeInTheDocument();
    });

    it('should handle missing preview gracefully', () => {
      const tileDataWithoutPreview = { title: 'Project Plan' };

      render(
        <TestProviders>
          <FavoriteListItem favorite={mockFavorite} tileData={tileDataWithoutPreview} />
        </TestProviders>
      );

      expect(screen.getByText('@project_plan')).toBeInTheDocument();
      expect(screen.getByText('Project Plan')).toBeInTheDocument();
    });

    it('should handle missing tile data gracefully', () => {
      render(
        <TestProviders>
          <FavoriteListItem favorite={mockFavorite} tileData={undefined} />
        </TestProviders>
      );

      expect(screen.getByText('@project_plan')).toBeInTheDocument();
      // Should show placeholder or shortcut name as fallback
      // When tileData is undefined, we show the shortcut name as the title
      const titleElements = screen.getAllByText(/untitled|project_plan/i);
      expect(titleElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should have correct test id', () => {
      render(
        <TestProviders>
          <FavoriteListItem favorite={mockFavorite} tileData={mockTileData} />
        </TestProviders>
      );

      expect(screen.getByTestId('favorite-item-fav-1')).toBeInTheDocument();
    });

    it('should truncate long preview text', () => {
      const longPreviewTileData = {
        title: 'Project Plan',
        preview: 'This is a very long preview text that should be truncated to prevent the list item from becoming too large and taking up too much vertical space in the sidebar panel',
      };

      render(
        <TestProviders>
          <FavoriteListItem favorite={mockFavorite} tileData={longPreviewTileData} />
        </TestProviders>
      );

      const previewElement = screen.getByTestId('favorite-item-preview');
      expect(previewElement).toHaveClass('truncate');
    });
  });

  describe('remove button', () => {
    it('should show remove button', () => {
      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            onRemove={vi.fn()}
          />
        </TestProviders>
      );

      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('should hide remove button by default when showRemoveButton is false', () => {
      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            showRemoveButton={false}
          />
        </TestProviders>
      );

      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });

    it('should show edit button when showEditButton is true and onSaveShortcut is provided', () => {
      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            showEditButton={true}
            onSaveShortcut={vi.fn()}
          />
        </TestProviders>
      );

      expect(screen.getByRole('button', { name: /edit shortcut/i })).toBeInTheDocument();
    });

    it('should hide edit button when showEditButton is false', () => {
      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            showEditButton={false}
            onSaveShortcut={vi.fn()}
          />
        </TestProviders>
      );

      expect(screen.queryByRole('button', { name: /edit shortcut/i })).not.toBeInTheDocument();
    });

    it('should call onRemove with favorite id when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();

      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            onRemove={onRemove}
          />
        </TestProviders>
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onRemove).toHaveBeenCalledWith('fav-1');
    });

    it('should stop event propagation when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const onRemove = vi.fn();

      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            onClick={onClick}
            onRemove={onRemove}
          />
        </TestProviders>
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      expect(onRemove).toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should use StarOff icon for remove button', () => {
      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            onRemove={vi.fn()}
          />
        </TestProviders>
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });
      expect(removeButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('click handling', () => {
    it('should call onClick when content area is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            onClick={onClick}
          />
        </TestProviders>
      );

      // Click on the navigate to tile button (content area)
      const navigateButton = screen.getByRole('button', { name: /navigate to tile/i });
      await user.click(navigateButton);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith('user-1,0:1,2');
    });

    it('should call onShortcutClick when @shortcut is clicked', async () => {
      const user = userEvent.setup();
      const onShortcutClick = vi.fn();

      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            onShortcutClick={onShortcutClick}
          />
        </TestProviders>
      );

      // Click on the @shortcut button
      const shortcutButton = screen.getByRole('button', { name: /insert @project_plan into chat/i });
      await user.click(shortcutButton);

      expect(onShortcutClick).toHaveBeenCalledTimes(1);
      expect(onShortcutClick).toHaveBeenCalledWith('project_plan');
    });

    it('should show inline editor when edit button is clicked', async () => {
      const user = userEvent.setup();
      const onSaveShortcut = vi.fn();

      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            onSaveShortcut={onSaveShortcut}
          />
        </TestProviders>
      );

      const editButton = screen.getByRole('button', { name: /edit shortcut/i });
      await user.click(editButton);

      // Editor should now be visible with input field
      expect(screen.getByRole('textbox', { name: /edit shortcut name/i })).toBeInTheDocument();
      // Edit button should be hidden while editing
      expect(screen.queryByRole('button', { name: /edit shortcut/i })).not.toBeInTheDocument();
    });
  });


  describe('selected state', () => {
    it('should apply selected styles when isSelected is true', () => {
      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            isSelected={true}
          />
        </TestProviders>
      );

      const listItem = screen.getByTestId('favorite-item-fav-1');
      expect(listItem).toHaveClass('selected');
    });

    it('should NOT apply selected styles when isSelected is false', () => {
      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            isSelected={false}
          />
        </TestProviders>
      );

      const listItem = screen.getByTestId('favorite-item-fav-1');
      expect(listItem).not.toHaveClass('selected');
    });
  });

  describe('accessibility', () => {
    it('should be a list item element', () => {
      render(
        <TestProviders>
          <FavoriteListItem favorite={mockFavorite} tileData={mockTileData} />
        </TestProviders>
      );

      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });

    it('should have proper aria-label', () => {
      render(
        <TestProviders>
          <FavoriteListItem favorite={mockFavorite} tileData={mockTileData} />
        </TestProviders>
      );

      const listItem = screen.getByRole('listitem');
      expect(listItem).toHaveAttribute(
        'aria-label',
        expect.stringContaining('project_plan')
      );
    });

    it('should have focusable buttons for keyboard navigation', () => {
      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            onClick={vi.fn()}
            onShortcutClick={vi.fn()}
            onRemove={vi.fn()}
            onSaveShortcut={vi.fn()}
          />
        </TestProviders>
      );

      // All buttons should be focusable
      const shortcutButton = screen.getByRole('button', { name: /insert @project_plan into chat/i });
      const navigateButton = screen.getByRole('button', { name: /navigate to tile/i });
      const editButton = screen.getByRole('button', { name: /edit shortcut/i });
      const removeButton = screen.getByRole('button', { name: /remove/i });

      expect(shortcutButton).not.toHaveAttribute('tabindex', '-1');
      expect(navigateButton).not.toHaveAttribute('tabindex', '-1');
      expect(editButton).not.toHaveAttribute('tabindex', '-1');
      expect(removeButton).not.toHaveAttribute('tabindex', '-1');
    });

    it('should have aria-describedby pointing to preview', () => {
      render(
        <TestProviders>
          <FavoriteListItem favorite={mockFavorite} tileData={mockTileData} />
        </TestProviders>
      );

      const listItem = screen.getByRole('listitem');
      const preview = screen.getByTestId('favorite-item-preview');

      expect(listItem).toHaveAttribute('aria-describedby', preview.id);
    });
  });

  describe('loading state', () => {
    it('should show loading skeleton when isLoading is true', () => {
      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            isLoading={true}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('favorite-item-skeleton')).toBeInTheDocument();
    });

    it('should show skeleton instead of content when loading', () => {
      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            isLoading={true}
          />
        </TestProviders>
      );

      // When loading, skeleton is shown instead of interactive buttons
      expect(screen.getByTestId('favorite-item-skeleton')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /navigate to tile/i })).not.toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('should apply disabled styles when disabled is true', () => {
      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            disabled={true}
          />
        </TestProviders>
      );

      const listItem = screen.getByTestId('favorite-item-fav-1');
      expect(listItem).toHaveClass('opacity-50');
      expect(listItem).toHaveAttribute('data-disabled', 'true');
    });

    it('should NOT call onClick when disabled and content is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <TestProviders>
          <FavoriteListItem
            favorite={mockFavorite}
            tileData={mockTileData}
            onClick={onClick}
            disabled={true}
          />
        </TestProviders>
      );

      // Try clicking the navigate button (content area)
      const navigateButton = screen.getByRole('button', { name: /navigate to tile/i });
      await user.click(navigateButton);

      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
