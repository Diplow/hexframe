import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreviewWidget } from '../PreviewWidget';

describe('PreviewWidget', () => {
  it('should render tile title in card header', () => {
    render(
      <PreviewWidget
        tileId="tile-1"
        title="Test Tile"
        content="Test content"
      />
    );

    expect(screen.getByText('Test Tile')).toBeInTheDocument();
  });

  it('should render markdown content with proper formatting', () => {
    const markdownContent = `# Heading
    
This is a paragraph with **bold** text.

- Item 1
- Item 2`;

    render(
      <PreviewWidget
        tileId="tile-1"
        title="Test"
        content={markdownContent}
      />
    );

    // Check that markdown is rendered (ReactMarkdown will create these elements)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading');
    expect(screen.getByText(/This is a paragraph with/)).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('should handle empty content gracefully', () => {
    render(
      <PreviewWidget
        tileId="tile-1"
        title="Empty Tile"
        content=""
      />
    );

    expect(screen.getByText('Empty Tile')).toBeInTheDocument();
    // Card should still render even with empty content
    expect(screen.getByTestId('preview-widget')).toBeInTheDocument();
  });

  it('should apply flex layout', () => {
    render(
      <PreviewWidget
        tileId="tile-1"
        title="Test"
        content="Content"
      />
    );

    const card = screen.getByTestId('preview-widget');
    expect(card).toHaveClass('flex', 'flex-col', 'flex-1', 'w-full');
  });

  it('should render links as clickable', () => {
    const contentWithLink = 'Check out [this link](https://example.com)';

    render(
      <PreviewWidget
        tileId="tile-1"
        title="Test"
        content={contentWithLink}
      />
    );

    const link = screen.getByRole('link', { name: 'this link' });
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('should escape dangerous HTML in markdown', () => {
    const dangerousContent = `<script>alert('xss')</script>
    
Normal text`;

    render(
      <PreviewWidget
        tileId="tile-1"
        title="Test"
        content={dangerousContent}
      />
    );

    // Script tag should not be executed or rendered
    expect(screen.queryByText("alert('xss')")).not.toBeInTheDocument();
    expect(screen.getByText('Normal text')).toBeInTheDocument();
  });
});