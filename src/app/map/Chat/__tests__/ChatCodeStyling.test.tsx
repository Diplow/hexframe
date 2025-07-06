import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessages } from '../ChatMessages';
import type { Message } from '../_cache/_events/event.types';

// Mock the PreviewWidget component
vi.mock('../Widgets/PreviewWidget', () => ({
  PreviewWidget: () => <div data-testid="preview-widget">Preview</div>,
}));

describe('Chat Code Styling', () => {
  it('should apply neutral-400 background and dark text to inline code', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'user',
        content: 'Here is some `inline code` in the message',
        timestamp: new Date(),
      },
    ];

    render(<ChatMessages messages={messages} widgets={[]} />);

    const codeElement = screen.getByText('inline code');
    expect(codeElement.tagName).toBe('CODE');
    expect(codeElement).toHaveClass('bg-neutral-400', 'dark:bg-neutral-700');
    expect(codeElement).toHaveClass('text-neutral-900', 'dark:text-neutral-100');
  });

  it('should apply neutral-400 background and dark text to code blocks', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'user',
        content: '```javascript\nconst greeting = "Hello";\nconsole.log(greeting);\n```',
        timestamp: new Date(),
      },
    ];

    render(<ChatMessages messages={messages} widgets={[]} />);

    // Check for the code content
    const codeContent = screen.getByText(/const greeting = "Hello";/);
    expect(codeContent).toBeInTheDocument();
    
    // Find the pre element
    const preElement = codeContent.closest('pre');
    expect(preElement).toHaveClass('bg-neutral-400', 'dark:bg-neutral-700');
    expect(preElement).toHaveClass('text-neutral-900', 'dark:text-neutral-100');
  });

  it('should have proper padding and rounding for code blocks', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'user',
        content: '```\nCode block content\n```',
        timestamp: new Date(),
      },
    ];

    render(<ChatMessages messages={messages} widgets={[]} />);

    const codeContent = screen.getByText('Code block content');
    const preElement = codeContent.closest('pre');
    
    expect(preElement).toHaveClass('p-4', 'rounded-lg', 'overflow-x-auto');
  });

  it('should apply styling to inline code with proper padding', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'assistant',
        content: 'Use the `useState` hook for state management',
        timestamp: new Date(),
      },
    ];

    render(<ChatMessages messages={messages} widgets={[]} />);

    const codeElement = screen.getByText('useState');
    expect(codeElement).toHaveClass('px-1', 'py-0.5', 'rounded');
  });

  it('should handle mixed content with code properly', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'user',
        content: 'Regular text with `inline code` and a code block:\n\n```python\ndef hello():\n    print("Hello")\n```\n\nMore text after the code.',
        timestamp: new Date(),
      },
    ];

    render(<ChatMessages messages={messages} widgets={[]} />);

    // Check inline code
    const inlineCode = screen.getByText('inline code');
    expect(inlineCode).toHaveClass('bg-neutral-400');

    // Check code block
    const codeBlock = screen.getByText(/def hello/);
    expect(codeBlock).toBeInTheDocument();
  });
});