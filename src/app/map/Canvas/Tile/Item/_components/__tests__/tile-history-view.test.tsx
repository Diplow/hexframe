import '~/test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TileHistoryView } from '~/app/map/Canvas/Tile/Item/_components/tile-history-view';
import type { Coord } from '~/lib/domains/mapping/utils';

// Mock tRPC
vi.mock('~/lib/trpc/react', () => ({
  api: {
    mapItems: {
      getItemHistory: {
        useQuery: vi.fn(),
      },
      getItemVersion: {
        useQuery: vi.fn(),
      },
    },
  },
}));

import { api } from '~/lib/trpc/react';

describe('TileHistoryView', () => {
  const mockCoords: Coord = {
    userId: 1,
    groupId: 0,
    path: [1],
  };

  const mockHistoryData = [
    {
      versionNumber: 3,
      title: 'Latest Version',
      content: 'Latest content',
      preview: 'Latest preview',
      link: '',
      updatedAt: new Date('2024-01-03'),
      updatedBy: 'user1',
    },
    {
      versionNumber: 2,
      title: 'Middle Version',
      content: 'Middle content',
      preview: 'Middle preview',
      link: '',
      updatedAt: new Date('2024-01-02'),
      updatedBy: 'user1',
    },
    {
      versionNumber: 1,
      title: 'First Version',
      content: 'First content',
      preview: 'First preview',
      link: '',
      updatedAt: new Date('2024-01-01'),
      updatedBy: 'user1',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should display loading indicator while fetching history', () => {
      vi.mocked(api.mapItems.getItemHistory.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display error message when history fetch fails', () => {
      vi.mocked(api.mapItems.getItemHistory.useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch history'),
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load version history/i)).toBeInTheDocument();
    });
  });

  describe('History list', () => {
    it('should display version timeline when history is loaded', () => {
      vi.mocked(api.mapItems.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      expect(screen.getByText('Latest Version')).toBeInTheDocument();
      expect(screen.getByText('Middle Version')).toBeInTheDocument();
      expect(screen.getByText('First Version')).toBeInTheDocument();
    });

    it('should display version numbers for each history entry', () => {
      vi.mocked(api.mapItems.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      expect(screen.getByText(/version 3/i)).toBeInTheDocument();
      expect(screen.getByText(/version 2/i)).toBeInTheDocument();
      expect(screen.getByText(/version 1/i)).toBeInTheDocument();
    });

    it('should display formatted dates for each version', () => {
      vi.mocked(api.mapItems.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      // Dates should be formatted (exact format depends on implementation)
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it('should show "No version history" when history is empty', () => {
      vi.mocked(api.mapItems.getItemHistory.useQuery).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      expect(screen.getByText(/no version history/i)).toBeInTheDocument();
    });
  });

  describe('Version selection', () => {
    it('should load version details when a version is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(api.mapItems.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(api.mapItems.getItemVersion.useQuery).mockReturnValue({
        data: mockHistoryData[1],
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      const versionButton = screen.getByText('Middle Version');
      await user.click(versionButton);

      await waitFor(() => {
        expect(screen.getByText('Middle content')).toBeInTheDocument();
      });
    });

    it('should indicate selected version is historical', async () => {
      const user = userEvent.setup();

      vi.mocked(api.mapItems.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(api.mapItems.getItemVersion.useQuery).mockReturnValue({
        data: mockHistoryData[2],
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      const versionButton = screen.getByText('First Version');
      await user.click(versionButton);

      await waitFor(() => {
        expect(screen.getByText(/historical version/i)).toBeInTheDocument();
      });
    });

    it('should display version details in read-only format', async () => {
      const user = userEvent.setup();

      vi.mocked(api.mapItems.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(api.mapItems.getItemVersion.useQuery).mockReturnValue({
        data: mockHistoryData[1],
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      const versionButton = screen.getByText('Middle Version');
      await user.click(versionButton);

      await waitFor(() => {
        // Check that version details are shown
        expect(screen.getByText('Middle content')).toBeInTheDocument();

        // Check no edit controls are present
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /save|edit/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should allow returning to version list from detail view', async () => {
      const user = userEvent.setup();

      vi.mocked(api.mapItems.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(api.mapItems.getItemVersion.useQuery).mockReturnValue({
        data: mockHistoryData[1],
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      // Click to view a version
      const versionButton = screen.getByText('Middle Version');
      await user.click(versionButton);

      await waitFor(() => {
        expect(screen.getByText('Middle content')).toBeInTheDocument();
      });

      // Click back button
      const backButton = screen.getByRole('button', { name: /back|return/i });
      await user.click(backButton);

      // Should be back at version list
      expect(screen.getByText('Latest Version')).toBeInTheDocument();
      expect(screen.queryByText('Middle content')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(api.mapItems.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for version list', () => {
      vi.mocked(api.mapItems.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(list).toHaveAccessibleName(/version history|history/i);
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();

      vi.mocked(api.mapItems.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(api.mapItems.getItemVersion.useQuery).mockReturnValue({
        data: mockHistoryData[0],
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      // Tab to first version
      await user.tab();

      // Press Enter to select
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Latest content')).toBeInTheDocument();
      });
    });
  });
});
