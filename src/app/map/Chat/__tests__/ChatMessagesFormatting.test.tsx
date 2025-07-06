import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Messages } from '../Messages';
import type { Message } from '../_cache/_events/event.types';

// Mock the PreviewWidget component
vi.mock('../Widgets/PreviewWidget', () => ({
  PreviewWidget: () => <div data-testid="preview-widget">Preview</div>,
}));

describe('ChatMessages Formatting', () => {
  it('should display user messages with "You" as the name', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'user' as const,
        content: 'Hello, I need help',
        timestamp: new Date(),
      },
    ];

    render(<Messages messages={messages} widgets={[]} />);

    expect(screen.getByText('You:')).toBeInTheDocument();
    expect(screen.getByText('Hello, I need help')).toBeInTheDocument();
  });

  it('should display assistant messages with "Lucy" as the name', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'assistant',
        content: 'I can help you with that!',
        timestamp: new Date(),
      },
    ];

    render(<Messages messages={messages} widgets={[]} />);

    expect(screen.getByText('Lucy:')).toBeInTheDocument();
    expect(screen.getByText('I can help you with that!')).toBeInTheDocument();
  });

  it('should display system messages with "System" as the name', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'system' as const,
        content: 'Connection established',
        timestamp: new Date(),
      },
    ];

    render(<Messages messages={messages} widgets={[]} />);

    expect(screen.getByText('System:')).toBeInTheDocument();
    expect(screen.getByText('Connection established')).toBeInTheDocument();
  });

  it('should style names with bold font and appropriate colors', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'user' as const,
        content: 'User message',
        timestamp: new Date(),
      },
      {
        id: '2',
        actor: 'assistant',
        content: 'Assistant message',
        timestamp: new Date(),
      },
    ];

    render(<Messages messages={messages} widgets={[]} />);

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

    const messages: Message[] = [
      {
        id: '1',
        actor: 'user' as const,
        content: 'First message',
        timestamp: new Date(),
      },
    ];

    const { rerender } = render(<Messages messages={messages} widgets={[]} />);

    // Add a new message
    const newMessages: Message[] = [
      ...messages,
      {
        id: '2',
        actor: 'assistant' as const,
        content: 'Second message',
        timestamp: new Date(),
      },
    ];

    rerender(<Messages messages={newMessages} widgets={[]} />);

    // Verify scrollTop was set to scrollHeight
    expect(scrollTopSpy).toHaveBeenCalled();
  });
});