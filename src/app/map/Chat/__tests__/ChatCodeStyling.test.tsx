import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessages } from '../ChatMessages';
import type { ChatMessage } from '../types';

// Mock the PreviewWidget component
vi.mock('../Widgets/PreviewWidget', () => ({
  PreviewWidget: () => <div data-testid="preview-widget">Preview</div>,
}));

describe('Chat Code Styling', () => {
  it('should apply neutral-400 background to inline code in light mode', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: 'Here is some `inline code` in the message',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    const codeElement = screen.getByText('inline code');
    expect(codeElement.tagName).toBe('CODE');
    expect(codeElement).toHaveClass('bg-neutral-400', 'dark:bg-neutral-700');
  });

  it('should apply neutral-400 background to code blocks', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: '```javascript\nconst greeting = "Hello";\nconsole.log(greeting);\n```',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    // Check for the code content
    const codeContent = screen.getByText(/const greeting = "Hello";/);
    expect(codeContent).toBeInTheDocument();
    
    // Find the pre element
    const preElement = codeContent.closest('pre');
    expect(preElement).toHaveClass('bg-neutral-400', 'dark:bg-neutral-700');
  });

  it('should have proper padding and rounding for code blocks', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: '```\nCode block content\n```',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    const codeContent = screen.getByText('Code block content');
    const preElement = codeContent.closest('pre');
    
    expect(preElement).toHaveClass('p-4', 'rounded-lg', 'overflow-x-auto');
  });

  it('should apply styling to inline code with proper padding', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'assistant',
        content: 'Use the `useState` hook for state management',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    const codeElement = screen.getByText('useState');
    expect(codeElement).toHaveClass('px-1', 'py-0.5', 'rounded');
  });

  it('should handle mixed content with code properly', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: 'Regular text with `inline code` and a code block:\n\n```python\ndef hello():\n    print("Hello")\n```\n\nMore text after the code.',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    // Check inline code
    const inlineCode = screen.getByText('inline code');
    expect(inlineCode).toHaveClass('bg-neutral-400');

    // Check code block
    const codeBlock = screen.getByText(/def hello/);
    expect(codeBlock).toBeInTheDocument();
  });
});