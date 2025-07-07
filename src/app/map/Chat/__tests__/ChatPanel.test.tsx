import '~/test/setup'; // Import test setup FIRST
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../ChatPanel';
import { EventBus } from '../../Services/event-bus';

// Mock the useChatCache hook for isolated testing
vi.mock('../Cache/ChatCacheProvider', async () => {
  const actual = await vi.importActual('../Cache/ChatCacheProvider');
  return {
    ...actual,
    useChatCache: vi.fn(),
  };
});

import { useChatCache } from '../Cache/ChatCacheProvider';

const mockUseChatCache = vi.mocked(useChatCache);


describe('ChatPanel', () => {
  const mockDispatch = vi.fn();
  const mockEventBus = new EventBus();

  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('should render chat header', () => {
    mockUseChatCache.mockReturnValue({
      state: {
        events: [],
        visibleMessages: [],
        activeWidgets: [],
      },
      dispatch: mockDispatch,
      eventBus: mockEventBus,
    });

    render(<ChatPanel />);

    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('should display welcome message when no messages', () => {
    mockUseChatCache.mockReturnValue({
      state: {
        events: [],
        visibleMessages: [],
        activeWidgets: [],
      },
      dispatch: mockDispatch,
      eventBus: mockEventBus,
    });

    render(<ChatPanel />);

    expect(screen.getByText(/Welcome to Hexframe! Select a tile to explore its content./)).toBeInTheDocument();
  });

  it('should render messages in chronological order', () => {
    const messages = [
      {
        id: '1',
        content: 'First message',
        actor: 'system' as const,
        timestamp: new Date(),
      },
      {
        id: '2',
        content: 'Second message',
        actor: 'system' as const,
        timestamp: new Date(),
      },
    ];

    mockUseChatCache.mockReturnValue({
      state: {
        events: [],
        visibleMessages: messages,
        activeWidgets: [],
      },
      dispatch: mockDispatch,
      eventBus: mockEventBus,
    });

    render(<ChatPanel />);

    const messageElements = screen.getAllByTestId(/^chat-message-\d+$/);
    expect(messageElements).toHaveLength(2);
    expect(messageElements[0]).toHaveTextContent('First message');
    expect(messageElements[1]).toHaveTextContent('Second message');
  });

  it('should apply correct layout classes for desktop', () => {
    mockUseChatCache.mockReturnValue({
      state: {
        events: [],
        visibleMessages: [],
        activeWidgets: [],
      },
      dispatch: mockDispatch,
      eventBus: mockEventBus,
    });

    render(<ChatPanel className="test-class" />);

    const chatPanel = screen.getByTestId('chat-panel');
    expect(chatPanel).toHaveClass('test-class');
    expect(chatPanel).toHaveClass('flex', 'flex-col', 'h-full');
  });

  it('should handle overflow with scrollable message area', () => {
    mockUseChatCache.mockReturnValue({
      state: {
        events: [],
        visibleMessages: [],
        activeWidgets: [],
      },
      dispatch: mockDispatch,
      eventBus: mockEventBus,
    });

    render(<ChatPanel />);

    const messagesArea = screen.getByTestId('chat-messages');
    expect(messagesArea).toHaveClass('flex-1', 'overflow-y-auto');
  });

  it.skip('should pass close action to header (chat is always open)', async () => {
    mockUseChatCache.mockReturnValue({
      state: {
        events: [],
        visibleMessages: [],
        activeWidgets: [],
      },
      dispatch: mockDispatch,
      eventBus: mockEventBus,
    });

    render(<ChatPanel />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLOSE_CHAT' });
  });
});