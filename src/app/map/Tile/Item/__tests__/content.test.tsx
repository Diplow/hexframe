import '~/test/setup'; // Import test setup FIRST
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DynamicTileContent } from '../content';

describe('DynamicTileContent - Simplified', () => {
  it('should only display title regardless of scale', () => {
    const data = {
      title: 'Test Title',
      description: 'Test Description',
      url: 'https://example.com',
    };

    // Test scale 1
    const { rerender } = render(<DynamicTileContent data={data} scale={1} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
    expect(screen.queryByText('https://example.com')).not.toBeInTheDocument();

    // Test scale 2
    rerender(<DynamicTileContent data={data} scale={2} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
    expect(screen.queryByText('https://example.com')).not.toBeInTheDocument();

    // Test scale 3
    rerender(<DynamicTileContent data={data} scale={3} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
    expect(screen.queryByText('https://example.com')).not.toBeInTheDocument();
  });

  it('should truncate long titles appropriately', () => {
    const data = {
      title: 'This is a very long title that should be truncated to fit within the tile boundaries',
    };

    render(<DynamicTileContent data={data} scale={1} />);
    const titleElement = screen.getByText(/This is a very long title/);
    expect(titleElement.textContent).toMatch(/\.\.\.$/);
  });

  it('should show "Untitled" for tiles without title', () => {
    const data = {};

    render(<DynamicTileContent data={data} scale={2} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('should apply selected state ring when selected', () => {
    const data = { title: 'Test' };

    render(<DynamicTileContent data={data} scale={2} isSelected={true} />);
    const container = screen.getByTestId('tile-content');
    expect(container).toHaveClass('ring-2', 'ring-primary');
  });

  it('should center title text in tile', () => {
    const data = { title: 'Centered Title' };

    render(<DynamicTileContent data={data} scale={2} />);
    const container = screen.getByTestId('tile-content');
    expect(container).toHaveClass('items-center', 'justify-center');
  });

  it('should not show description or URL at any scale', () => {
    const data = {
      title: 'Title Only',
      description: 'This should not be shown',
      url: 'https://should-not-be-shown.com',
    };

    // Test all scales
    for (const scale of [1, 2, 3, 4] as const) {
      const { unmount } = render(<DynamicTileContent data={data} scale={scale} />);
      expect(screen.queryByText('This should not be shown')).not.toBeInTheDocument();
      expect(screen.queryByText(/should-not-be-shown/)).not.toBeInTheDocument();
      unmount();
    }
  });
});