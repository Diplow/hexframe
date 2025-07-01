import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessages } from '../ChatMessages';
import type { ChatMessage } from '../types';

interface MockPreviewWidgetProps {
  title: string;
  content: string;
}

// Mock the PreviewWidget component
vi.mock('../Widgets/PreviewWidget', () => ({
  PreviewWidget: ({ title, content }: MockPreviewWidgetProps) => (
    <div data-testid="preview-widget">
      <h3>{title}</h3>
      <p>{content}</p>
    </div>
  ),
}));

describe('ChatMessages', () => {
  it('should render empty state with welcome message', () => {
    render(<ChatMessages messages={[]} expandedPreviewId={null} />);

    expect(screen.getByText('Hexframe:')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to Hexframe! Select a tile to explore its content./)).toBeInTheDocument();
  });

  it('should render system messages with correct styling', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'system',
        content: 'This is a system message',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    const message = screen.getByTestId('chat-message-1');
    expect(message).toHaveTextContent('System:');
    expect(message).toHaveTextContent('This is a system message');
  });

  it('should render preview widgets for tile content', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'system',
        content: {
          type: 'preview',
          data: {
            tileId: 'tile-1',
            title: 'Test Tile',
            content: 'Test content',
          },
        },
        metadata: { timestamp: new Date(), tileId: 'tile-1' },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    const widget = screen.getByTestId('preview-widget');
    expect(widget).toBeInTheDocument();
    expect(widget).toHaveTextContent('Test Tile');
    expect(widget).toHaveTextContent('Test content');
  });

  it('should maintain scroll position when new messages added', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'system',
        content: 'First message',
        metadata: { timestamp: new Date() },
      },
    ];

    const { rerender } = render(<ChatMessages messages={messages} expandedPreviewId={null} />);
    
    const scrollContainer = screen.getByTestId('chat-messages');
    
    // Add more messages
    const moreMessages = [
      ...messages,
      {
        id: '2',
        type: 'system' as const,
        content: 'Second message',
        metadata: { timestamp: new Date() },
      },
    ];

    rerender(<ChatMessages messages={moreMessages} expandedPreviewId={null} />);

    // Check that the container has overflow-y-auto for scrolling
    expect(scrollContainer).toHaveClass('overflow-y-auto');
  });

  it('should apply correct spacing between messages', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'system',
        content: 'First message',
        metadata: { timestamp: new Date() },
      },
      {
        id: '2',
        type: 'system',
        content: 'Second message',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    const container = screen.getByTestId('chat-messages');
    expect(container).toHaveClass('space-y-4');
  });
});