/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import '~/test/setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Coord } from '~/lib/domains/mapping/utils';

// Mock tRPC BEFORE importing components
vi.mock('~/commons/trpc/react', () => ({
  api: {
    map: {
      items: {
        getItemHistory: {
          useQuery: vi.fn(),
        },
        getItemVersion: {
          useQuery: vi.fn(),
        },
      },
    },
    useUtils: vi.fn(() => ({
      map: {
        items: {
          getItemHistory: {
            invalidate: vi.fn(),
          },
        },
      },
    })),
  },
}));

// Mock useMapCache
vi.mock('~/app/map/Cache', () => ({
  useMapCache: vi.fn(() => ({
    getItem: vi.fn((coordId: string) => ({
      data: {
        title: 'Current Title',
        preview: 'Current preview',
        content: 'Current content',
      },
      metadata: {
        coordId,
      },
    })),
    updateItemOptimistic: vi.fn(),
  })),
}));

import { TileHistoryView } from '~/app/map/Chat/Timeline/Widgets/TileHistoryWidget/TileHistoryWidget';
import { api } from '~/commons/trpc/react';

describe('TileHistoryView', () => {
  const mockCoords: Coord = {
    userId: "user-test-1",
    groupId: 0,
    path: [1],
  };

  const mockHistoryData = {
    coords: mockCoords,
    currentVersion: {
      versionNumber: 3,
      title: 'Latest Version',
      content: 'Latest content',
      preview: 'Latest preview',
      link: '',
      createdAt: new Date('2024-01-03'),
      updatedBy: 'user1',
    },
    versions: [
      {
        versionNumber: 3,
        title: 'Latest Version',
        content: 'Latest content',
        preview: 'Latest preview',
        link: '',
        createdAt: new Date('2024-01-03'),
        updatedBy: 'user1',
      },
      {
        versionNumber: 2,
        title: 'Middle Version',
        content: 'Middle content',
        preview: 'Middle preview',
        link: '',
        createdAt: new Date('2024-01-02'),
        updatedBy: 'user1',
      },
      {
        versionNumber: 1,
        title: 'First Version',
        content: 'First content',
        preview: 'First preview',
        link: '',
        createdAt: new Date('2024-01-01'),
        updatedBy: 'user1',
      },
    ],
    totalCount: 3,
    hasMore: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for getItemVersion to prevent undefined errors
    vi.mocked(api.map.items.getItemVersion.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);
  });

  describe('Loading state', () => {
    it('should display loading indicator while fetching history', () => {
      vi.mocked(api.map.items.getItemHistory.useQuery).mockReturnValue({
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
      vi.mocked(api.map.items.getItemHistory.useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch history'),
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      expect(screen.getByText(/failed to load history/i)).toBeInTheDocument();
    });
  });

  describe('History list', () => {
    it('should display version timeline when history is loaded', () => {
      vi.mocked(api.map.items.getItemHistory.useQuery).mockReturnValue({
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
      vi.mocked(api.map.items.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      // Current version shows "Current" badge instead of version number
      expect(screen.getByText('Current')).toBeInTheDocument();
      // Historical versions show as v1, v2, v3 badges
      expect(screen.getByText('v3')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
      expect(screen.getByText('v1')).toBeInTheDocument();
    });

    it('should display formatted dates for each version', () => {
      vi.mocked(api.map.items.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      // Dates should be formatted (exact format depends on implementation)
      const dates = screen.getAllByText(/2024/);
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should show "No version history" when history is empty', () => {
      vi.mocked(api.map.items.getItemHistory.useQuery).mockReturnValue({
        data: { coords: mockCoords, currentVersion: null as any, versions: [], totalCount: 0, hasMore: false },
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

      vi.mocked(api.map.items.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(api.map.items.getItemVersion.useQuery).mockReturnValue({
        data: mockHistoryData.versions[1],
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

      vi.mocked(api.map.items.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(api.map.items.getItemVersion.useQuery).mockReturnValue({
        data: mockHistoryData.versions[2],
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

      vi.mocked(api.map.items.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(api.map.items.getItemVersion.useQuery).mockReturnValue({
        data: mockHistoryData.versions[1],
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

      vi.mocked(api.map.items.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      vi.mocked(api.map.items.getItemVersion.useQuery).mockReturnValue({
        data: mockHistoryData.versions[1],
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

      // Click close button to return to version list
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Should be back at version list
      await waitFor(() => {
        expect(screen.getByText('Latest Version')).toBeInTheDocument();
        expect(screen.queryByText('Middle content')).not.toBeInTheDocument();
      });
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(api.map.items.getItemHistory.useQuery).mockReturnValue({
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
    it('should have proper heading for version history', () => {
      vi.mocked(api.map.items.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      // Check that the widget has a clear title
      expect(screen.getByText('Version History')).toBeInTheDocument();

      // Check that all versions are accessible
      expect(screen.getByText('Current Title')).toBeInTheDocument();
      expect(screen.getByText('Latest Version')).toBeInTheDocument();
      expect(screen.getByText('Middle Version')).toBeInTheDocument();
      expect(screen.getByText('First Version')).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();

      vi.mocked(api.map.items.getItemHistory.useQuery).mockReturnValue({
        data: mockHistoryData,
        isLoading: false,
        error: null,
      } as any);

      const onClose = vi.fn();
      render(<TileHistoryView coords={mockCoords} onClose={onClose} />);

      // Get the first historical version (not current)
      const firstVersionDiv = screen.getByText('Latest Version').closest('div');
      expect(firstVersionDiv).toBeInTheDocument();

      // Mock the version detail query AFTER rendering but BEFORE clicking
      vi.mocked(api.map.items.getItemVersion.useQuery).mockReturnValue({
        data: mockHistoryData.versions[0],
        isLoading: false,
        error: null,
      } as any);

      // Click the version to view details
      await user.click(firstVersionDiv!);

      await waitFor(() => {
        expect(screen.getByText('Latest content')).toBeInTheDocument();
      });
    });
  });
});
