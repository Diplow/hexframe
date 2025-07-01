import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessages } from '../ChatMessages';
import type { ChatMessage } from '../types';

// Mock the PreviewWidget component
vi.mock('../Widgets/PreviewWidget', () => ({
  PreviewWidget: () => <div data-testid="preview-widget">Preview</div>,
}));

describe('ChatMessages Markdown Rendering', () => {
  it('should render user messages as markdown', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: '**Bold text** and *italic text*',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    // Check that markdown is rendered
    const boldElement = screen.getByText('Bold text');
    expect(boldElement.tagName).toBe('STRONG');
    
    const italicElement = screen.getByText('italic text');
    expect(italicElement.tagName).toBe('EM');
  });

  it('should render markdown links with security attributes', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: 'Check out [this link](https://example.com)',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    const link = screen.getByRole('link', { name: 'this link' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render code blocks in user messages', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: 'Here is some code:\n```javascript\nconst x = 42;\n```',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    const codeBlock = screen.getByText('const x = 42;');
    expect(codeBlock.tagName).toBe('CODE');
  });

  it('should render lists in user messages', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: '- First item\n- Second item\n- Third item',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(screen.getByText('Second item')).toBeInTheDocument();
    expect(screen.getByText('Third item')).toBeInTheDocument();
  });

  it('should render assistant messages as markdown too', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'assistant',
        content: 'Here is a **bold** response with a [link](https://example.com)',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    const boldElement = screen.getByText('bold');
    expect(boldElement.tagName).toBe('STRONG');
    
    const link = screen.getByRole('link', { name: 'link' });
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('should handle multi-line messages correctly', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: 'Line 1\n\nLine 2 with **emphasis**\n\nLine 3',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText(/Line 2 with/)).toBeInTheDocument();
    expect(screen.getByText('emphasis')).toBeInTheDocument();
    expect(screen.getByText('Line 3')).toBeInTheDocument();
  });
});