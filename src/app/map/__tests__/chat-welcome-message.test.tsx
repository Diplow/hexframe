import '~/test/setup'; // Import test setup FIRST
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { ChatCacheProvider, useChatCache } from '../Chat/Cache/ChatCacheProvider';
import { Messages } from '../Chat/Messages';
import { EventBus } from '../Services/event-bus';
import type { ChatEvent } from '../Chat/Cache/_events/event.types';
import { AuthProvider } from '~/contexts/AuthContext';

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
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
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

// Test component that uses the chat cache state
function TestMessages() {
  const { state } = useChatCache();
  return <Messages messages={state.visibleMessages} widgets={state.activeWidgets} />;
}

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
      <AuthProvider>
        <ChatCacheProvider eventBus={mockEventBus} initialEvents={[welcomeEvent]}>
          <TestMessages />
        </ChatCacheProvider>
      </AuthProvider>
    );

    // Check that the welcome message is displayed
    expect(screen.getByText('System:')).toBeInTheDocument();
    // The message content is parsed as markdown, so we need to check for parts
    expect(screen.getByText(/Welcome to/)).toBeInTheDocument();
    expect(screen.getByText('HexFrame')).toBeInTheDocument();
    expect(screen.getByText(/Navigate the map by clicking on tiles/)).toBeInTheDocument();
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
      <AuthProvider>
        <ChatCacheProvider eventBus={mockEventBus} initialEvents={[welcomeEvent]}>
          <TestMessages />
        </ChatCacheProvider>
      </AuthProvider>
    );

    // Check welcome message is present
    expect(screen.getByText('System:')).toBeInTheDocument();
    
    // Unmount to simulate page unload
    unmount();
    
    // Re-render to simulate page reload
    render(
      <AuthProvider>
        <ChatCacheProvider eventBus={mockEventBus} initialEvents={[welcomeEvent]}>
          <TestMessages />
        </ChatCacheProvider>
      </AuthProvider>
    );

    // Welcome message should still be displayed
    expect(screen.getByText('System:')).toBeInTheDocument();
    // The message content is parsed as markdown, so we need to check for parts
    expect(screen.getByText(/Welcome to/)).toBeInTheDocument();
    expect(screen.getByText('HexFrame')).toBeInTheDocument();
    expect(screen.getByText(/Navigate the map by clicking on tiles/)).toBeInTheDocument();
  });
});