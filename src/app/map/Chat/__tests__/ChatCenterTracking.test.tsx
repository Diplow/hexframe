import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatProvider } from '../ChatProvider';
import { ChatWithCenterTracking } from '../ChatWithCenterTracking';
import type { ReactNode } from 'react';

// Mock the useMapCache hook
vi.mock('../../Cache/_hooks/use-map-cache', () => ({
  useMapCache: vi.fn(),
}));

import { useMapCache } from '../../Cache/_hooks/use-map-cache';
const mockUseMapCache = vi.mocked(useMapCache);

function TestWrapper({ children }: { children: ReactNode }) {
  return <ChatProvider>{children}</ChatProvider>;
}

describe('Chat Center Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to initial state
    mockUseMapCache.mockReturnValue({
      center: null,
      items: {},
    } as any);
  });

  it('should not show navigation message on initial mount', () => {
    mockUseMapCache.mockReturnValue({
      center: 'tile-1',
      items: {
        'tile-1': {
          metadata: { coordId: 'tile-1' },
          data: { name: 'Home Tile' },
        },
      },
    } as any);

    render(
      <TestWrapper>
        <ChatWithCenterTracking />
      </TestWrapper>
    );

    // Should only show welcome message, not navigation message
    expect(screen.getByText(/Welcome to Hexframe!/)).toBeInTheDocument();
    expect(screen.queryByText(/Navigated to/)).not.toBeInTheDocument();
  });

  it('should show navigation message when center changes', () => {
    const { rerender } = render(
      <TestWrapper>
        <ChatWithCenterTracking />
      </TestWrapper>
    );

    // Initial state
    mockUseMapCache.mockReturnValue({
      center: 'tile-1',
      items: {
        'tile-1': {
          metadata: { coordId: 'tile-1' },
          data: { name: 'Home Tile' },
        },
      },
    } as any);

    rerender(
      <TestWrapper>
        <ChatWithCenterTracking />
      </TestWrapper>
    );

    // Change center
    mockUseMapCache.mockReturnValue({
      center: 'tile-2',
      items: {
        'tile-2': {
          metadata: { coordId: 'tile-2' },
          data: { name: 'Projects' },
        },
      },
    } as any);

    rerender(
      <TestWrapper>
        <ChatWithCenterTracking />
      </TestWrapper>
    );

    // Should show navigation message
    expect(screen.getByText(/📍 Navigated to/)).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('should use coordinate ID when tile has no name', () => {
    // Start with initial tile
    mockUseMapCache.mockReturnValue({
      center: 'tile-1',
      items: {
        'tile-1': {
          metadata: { coordId: 'tile-1' },
          data: { name: 'Home' },
        },
      },
    } as any);

    const { rerender } = render(
      <TestWrapper>
        <ChatWithCenterTracking />
      </TestWrapper>
    );

    // Change to tile without name
    mockUseMapCache.mockReturnValue({
      center: 'tile-3',
      items: {
        'tile-3': {
          metadata: { coordId: 'tile-3' },
          data: { name: null },
        },
      },
    } as any);

    rerender(
      <TestWrapper>
        <ChatWithCenterTracking />
      </TestWrapper>
    );

    // Should show "Untitled" for tiles without names
    const messages = screen.getAllByText(/📍 Navigated to/);
    expect(messages).toHaveLength(1);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('should not show duplicate messages for same center', () => {
    // Start with initial center
    mockUseMapCache.mockReturnValue({
      center: 'tile-1',
      items: {
        'tile-1': {
          metadata: { coordId: 'tile-1' },
          data: { name: 'Home' },
        },
      },
    } as any);

    const { rerender } = render(
      <TestWrapper>
        <ChatWithCenterTracking />
      </TestWrapper>
    );

    // Navigate to new center
    mockUseMapCache.mockReturnValue({
      center: 'tile-2',
      items: {
        'tile-2': {
          metadata: { coordId: 'tile-2' },
          data: { name: 'About' },
        },
      },
    } as any);

    rerender(
      <TestWrapper>
        <ChatWithCenterTracking />
      </TestWrapper>
    );

    // Should have exactly one navigation message for the change
    let navigationMessages = screen.getAllByText(/📍 Navigated to/);
    expect(navigationMessages).toHaveLength(1);
    expect(screen.getByText('About')).toBeInTheDocument();

    // Re-render with same center (no change)
    rerender(
      <TestWrapper>
        <ChatWithCenterTracking />
      </TestWrapper>
    );

    // Should still only have one navigation message
    navigationMessages = screen.getAllByText(/📍 Navigated to/);
    expect(navigationMessages).toHaveLength(1);
  });
});