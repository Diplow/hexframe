import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../ChatPanel';
import { ChatProvider } from '../ChatProvider';
import type { ReactNode } from 'react';

// Mock the useChat hook for isolated testing
vi.mock('../ChatProvider', async () => {
  const actual = await vi.importActual('../ChatProvider');
  return {
    ...actual,
    useChat: vi.fn(),
  };
});

import { useChat } from '../ChatProvider';

const mockUseChat = vi.mocked(useChat);


describe('ChatPanel', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('should render chat header with close button', () => {
    mockUseChat.mockReturnValue({
      state: {
        messages: [],
        selectedTileId: null,
        isPanelOpen: true,
      },
      dispatch: mockDispatch,
    });

    render(<ChatPanel />);

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('should display welcome message when no messages', () => {
    mockUseChat.mockReturnValue({
      state: {
        messages: [],
        selectedTileId: null,
        isPanelOpen: true,
      },
      dispatch: mockDispatch,
    });

    render(<ChatPanel />);

    expect(screen.getByText(/Welcome to Hexframe! Select a tile to explore its content./)).toBeInTheDocument();
  });

  it('should render messages in chronological order', () => {
    const messages = [
      {
        id: '1',
        type: 'system' as const,
        content: 'First message',
        metadata: { timestamp: new Date() },
      },
      {
        id: '2',
        type: 'system' as const,
        content: 'Second message',
        metadata: { timestamp: new Date() },
      },
    ];

    mockUseChat.mockReturnValue({
      state: {
        messages,
        selectedTileId: null,
        isPanelOpen: true,
      },
      dispatch: mockDispatch,
    });

    render(<ChatPanel />);

    const messageElements = screen.getAllByTestId(/^chat-message-\d+$/);
    expect(messageElements).toHaveLength(2);
    expect(messageElements[0]).toHaveTextContent('First message');
    expect(messageElements[1]).toHaveTextContent('Second message');
  });

  it('should apply correct layout classes for desktop', () => {
    mockUseChat.mockReturnValue({
      state: {
        messages: [],
        selectedTileId: null,
        isPanelOpen: true,
      },
      dispatch: mockDispatch,
    });

    render(<ChatPanel className="test-class" />);

    const chatPanel = screen.getByTestId('chat-panel');
    expect(chatPanel).toHaveClass('test-class');
    expect(chatPanel).toHaveClass('flex', 'flex-col', 'h-full');
  });

  it('should handle overflow with scrollable message area', () => {
    mockUseChat.mockReturnValue({
      state: {
        messages: [],
        selectedTileId: null,
        isPanelOpen: true,
      },
      dispatch: mockDispatch,
    });

    render(<ChatPanel />);

    const messagesArea = screen.getByTestId('chat-messages');
    expect(messagesArea).toHaveClass('flex-1', 'overflow-y-auto');
  });

  it('should pass close action to header', async () => {
    mockUseChat.mockReturnValue({
      state: {
        messages: [],
        selectedTileId: null,
        isPanelOpen: true,
      },
      dispatch: mockDispatch,
    });

    render(<ChatPanel />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLOSE_CHAT' });
  });
});