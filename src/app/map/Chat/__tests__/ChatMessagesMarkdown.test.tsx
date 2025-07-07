import '~/test/setup'; // Import test setup FIRST
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Messages } from '../Messages';
import type { Message } from '../Cache/_events/event.types';
import { ChatCacheProvider } from '../Cache/ChatCacheProvider';
import { EventBus } from '../../Services/event-bus';

// Mock the PreviewWidget component
vi.mock('../Widgets/PreviewWidget', () => ({
  PreviewWidget: () => <div data-testid="preview-widget">Preview</div>,
}));

// Create mock EventBus
const mockEventBus = new EventBus();

// Helper function to render Messages with required providers
function renderMessages(messages: Message[], widgets = []) {
  return render(
    <ChatCacheProvider eventBus={mockEventBus}>
      <Messages messages={messages} widgets={widgets} />
    </ChatCacheProvider>
  );
}

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

    renderMessages(messages);

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

    renderMessages(messages);

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

    renderMessages(messages);

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

    renderMessages(messages);

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

    renderMessages(messages);

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

    renderMessages(messages);

    // Check that all parts of the multi-line message are rendered
    const messageContainer = screen.getByText(/Line 1/);
    expect(messageContainer).toBeInTheDocument();
    
    // Check for emphasis
    const emphasisElement = screen.getByText('emphasis');
    expect(emphasisElement).toBeInTheDocument();
    expect(emphasisElement.tagName).toBe('STRONG');
  });
});