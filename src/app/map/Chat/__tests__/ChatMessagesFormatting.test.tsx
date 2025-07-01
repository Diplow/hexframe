import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessages } from '../ChatMessages';
import type { ChatMessage } from '../types';

// Mock the PreviewWidget component
vi.mock('../Widgets/PreviewWidget', () => ({
  PreviewWidget: () => <div data-testid="preview-widget">Preview</div>,
}));

describe('ChatMessages Formatting', () => {
  it('should display user messages with "You" as the name', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: 'Hello, I need help',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    expect(screen.getByText('You:')).toBeInTheDocument();
    expect(screen.getByText('Hello, I need help')).toBeInTheDocument();
  });

  it('should display assistant messages with "Lucy" as the name', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'assistant',
        content: 'I can help you with that!',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    expect(screen.getByText('Lucy:')).toBeInTheDocument();
    expect(screen.getByText('I can help you with that!')).toBeInTheDocument();
  });

  it('should display system messages with "System" as the name', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'system',
        content: 'Connection established',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    expect(screen.getByText('System:')).toBeInTheDocument();
    expect(screen.getByText('Connection established')).toBeInTheDocument();
  });

  it('should style names with bold font and appropriate colors', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: 'User message',
        metadata: { timestamp: new Date() },
      },
      {
        id: '2',
        type: 'assistant',
        content: 'Assistant message',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    const userNameElement = screen.getByText('You:');
    expect(userNameElement).toHaveClass('font-bold', 'text-secondary');
    
    const assistantNameElement = screen.getByText('Lucy:');
    expect(assistantNameElement).toHaveClass('font-bold', 'text-primary');
  });

  it('should auto-scroll to latest message', () => {
    const scrollTopSpy = vi.fn();
    
    // Mock scrollTop and scrollHeight
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get: scrollTopSpy,
      set: scrollTopSpy,
    });
    
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 1000,
    });

    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: 'First message',
        metadata: { timestamp: new Date() },
      },
    ];

    const { rerender } = render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    // Add a new message
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: '2',
        type: 'assistant',
        content: 'Second message',
        metadata: { timestamp: new Date() },
      },
    ];

    rerender(<ChatMessages messages={newMessages} expandedPreviewId={null} />);

    // Verify scrollTop was set to scrollHeight
    expect(scrollTopSpy).toHaveBeenCalled();
  });
});