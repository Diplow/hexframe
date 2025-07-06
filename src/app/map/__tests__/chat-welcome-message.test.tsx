import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { ChatCacheProvider } from '../Chat/_cache/ChatCacheProvider';
import { Messages } from '../Chat/Messages';
import { EventBus } from '../Services/event-bus';
import type { ChatEvent } from '../Chat/_cache/_events/event.types';

// Mock the required dependencies for ChatMessages
vi.mock('../Cache/_hooks/use-map-cache', () => ({
  useMapCache: () => ({
    updateItemOptimistic: vi.fn(),
  }),
}));

vi.mock('~/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('~/commons/trpc/react', () => ({
  api: {
    useUtils: () => ({}),
    map: {
      user: {
        createDefaultMapForCurrentUser: {
          useMutation: () => ({
            mutate: vi.fn(),
          }),
        },
        getUserMap: {
          useQuery: () => ({
            data: null,
            isLoading: false,
            error: null,
          }),
        },
      },
    },
  },
}));

// Mock widget components
vi.mock('../Chat/Widgets/PreviewWidget', () => ({
  PreviewWidget: () => null,
}));

describe('Chat Welcome Message', () => {
  const mockEventBus = new EventBus();

  beforeEach(() => {
    // Reset any mocks
    vi.clearAllMocks();
  });

  it('should display welcome message on page load', async () => {
    const welcomeEvent: ChatEvent = {
      type: 'message',
      payload: {
        content: 'Welcome to **HexFrame**! Navigate the map by clicking on tiles, or use the chat to ask questions.',
        actor: 'system',
      },
      id: 'welcome-message',
      timestamp: new Date(),
      actor: 'system',
    };
    
    render(
      <ChatCacheProvider eventBus={mockEventBus} initialEvents={[welcomeEvent]}>
        <Messages messages={[]} widgets={[]} />
      </ChatCacheProvider>
    );

    // Check that the welcome message is displayed
    expect(screen.getByText('Hexframe:')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to HexFrame!/)).toBeInTheDocument();
  });

  it('should persist welcome message after page reload', async () => {
    const welcomeEvent: ChatEvent = {
      type: 'message',
      payload: {
        content: 'Welcome to **HexFrame**! Navigate the map by clicking on tiles, or use the chat to ask questions.',
        actor: 'system',
      },
      id: 'welcome-message',
      timestamp: new Date(),
      actor: 'system',
    };
    
    // First render
    const { unmount } = render(
      <ChatCacheProvider eventBus={mockEventBus} initialEvents={[welcomeEvent]}>
        <Messages messages={[]} widgets={[]} />
      </ChatCacheProvider>
    );

    // Check welcome message is present
    expect(screen.getByText('Hexframe:')).toBeInTheDocument();
    
    // Unmount to simulate page unload
    unmount();
    
    // Re-render to simulate page reload
    render(
      <ChatCacheProvider eventBus={mockEventBus} initialEvents={[welcomeEvent]}>
        <Messages messages={[]} widgets={[]} />
      </ChatCacheProvider>
    );

    // Welcome message should still be displayed
    expect(screen.getByText('Hexframe:')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to HexFrame!/)).toBeInTheDocument();
  });
});