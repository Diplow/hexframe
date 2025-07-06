import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Messages } from '../Messages';
import type { Message } from '../_cache/_events/event.types';

// Mock the PreviewWidget component
vi.mock('../Widgets/PreviewWidget', () => ({
  PreviewWidget: () => <div data-testid="preview-widget">Preview</div>,
}));

describe('ChatMessages Markdown Rendering', () => {
  it('should render user messages as markdown', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'user' as const,
        content: '**Bold text** and *italic text*',
        timestamp: new Date(),
      },
    ];

    render(<Messages messages={messages} widgets={[]} />);

    // Check that markdown is rendered
    const boldElement = screen.getByText('Bold text');
    expect(boldElement.tagName).toBe('STRONG');
    
    const italicElement = screen.getByText('italic text');
    expect(italicElement.tagName).toBe('EM');
  });

  it('should render markdown links with security attributes', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'user' as const,
        content: 'Check out [this link](https://example.com)',
        timestamp: new Date(),
      },
    ];

    render(<Messages messages={messages} widgets={[]} />);

    const link = screen.getByRole('link', { name: 'this link' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render code blocks in user messages', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'user' as const,
        content: 'Here is some code:\n```javascript\nconst x = 42;\n```',
        timestamp: new Date(),
      },
    ];

    render(<Messages messages={messages} widgets={[]} />);

    const codeBlock = screen.getByText('const x = 42;');
    expect(codeBlock.tagName).toBe('CODE');
  });

  it('should render lists in user messages', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'user' as const,
        content: '- First item\n- Second item\n- Third item',
        timestamp: new Date(),
      },
    ];

    render(<Messages messages={messages} widgets={[]} />);

    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(screen.getByText('Second item')).toBeInTheDocument();
    expect(screen.getByText('Third item')).toBeInTheDocument();
  });

  it('should render assistant messages as markdown too', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'assistant' as const,
        content: 'Here is a **bold** response with a [link](https://example.com)',
        timestamp: new Date(),
      },
    ];

    render(<Messages messages={messages} widgets={[]} />);

    const boldElement = screen.getByText('bold');
    expect(boldElement.tagName).toBe('STRONG');
    
    const link = screen.getByRole('link', { name: 'link' });
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('should handle multi-line messages correctly', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'user' as const,
        content: 'Line 1\n\nLine 2 with **emphasis**\n\nLine 3',
        timestamp: new Date(),
      },
    ];

    render(<Messages messages={messages} widgets={[]} />);

    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText(/Line 2 with/)).toBeInTheDocument();
    expect(screen.getByText('emphasis')).toBeInTheDocument();
    expect(screen.getByText('Line 3')).toBeInTheDocument();
  });
});