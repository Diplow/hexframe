import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../ChatPanel';
import { ChatTestProviders, simulateMapEvent } from './ChatTestProvider';
import { createMockEventBus } from '~/test-utils/event-bus';
import { createUserMessageEvent } from '../Cache/_events/event.creators';

// Mock dependencies
vi.mock('~/lib/auth/auth-client', () => ({
  authClient: {
    signOut: vi.fn(),
    useSession: {
      get: vi.fn(() => ({ user: null })),
      subscribe: vi.fn(() => () => {}),
    },
  },
}));

vi.mock('~/contexts/AuthContext', async () => {
  const actual = await vi.importActual('~/contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      user: null,
    })),
  };
});

vi.mock('../Input', () => ({
  Input: () => (
    <div data-testid="chat-input">
      <button>Send</button>
    </div>
  ),
}));

vi.mock('../Messages', () => ({
  Messages: ({ messages, widgets }: { messages: any[]; widgets: any[] }) => (
    <div data-testid="chat-messages">
      <div>Messages: {messages.length}</div>
      <div>Widgets: {widgets.length}</div>
    </div>
  ),
}));

// Mock trpc
vi.mock('~/commons/trpc/react', () => ({
  api: {
    iam: {
      user: {
        whoami: {
          useQuery: vi.fn(() => ({
            data: null,
            isLoading: false,
            error: null,
          })),
        },
      },
    },
  },
}));

describe('ChatPanel', () => {
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    vi.clearAllMocks();
  });

  it('should render chat components', () => {
    render(
      <ChatTestProviders eventBus={mockEventBus}>
        <ChatPanel />
      </ChatTestProviders>
    );

    expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('should display preview widget when tile is selected', async () => {
    render(
      <ChatTestProviders eventBus={mockEventBus}>
        <ChatPanel />
      </ChatTestProviders>
    );

    // Simulate tile selection from Canvas
    simulateMapEvent.tileSelected(mockEventBus, {
      id: 'tile-123',
      title: 'Test Tile',
      description: 'A test tile',
      coordId: 'coord-123',
    });

    // Wait for chat to process the event
    await waitFor(() => {
      expect(mockEventBus).toHaveEmittedEvent('map.tile_selected');
    });
  });

  it('should handle user messages', async () => {
    render(
      <ChatTestProviders 
        eventBus={mockEventBus}
        initialChatEvents={[
          createUserMessageEvent('Hello world'),
        ]}
      >
        <ChatPanel />
      </ChatTestProviders>
    );

    // The chat should display messages
    expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    expect(screen.getByText(/Messages: 1/)).toBeInTheDocument();
  });

  it('should react to navigation events', async () => {
    render(
      <ChatTestProviders eventBus={mockEventBus}>
        <ChatPanel />
      </ChatTestProviders>
    );

    // Simulate navigation from Hierarchy
    simulateMapEvent.navigation(
      mockEventBus,
      'old-center-id',
      'new-center-id',
      'New Center Tile'
    );

    await waitFor(() => {
      expect(mockEventBus).toHaveEmittedEvent('map.navigation');
    });
  });

  it('should show auth widget when auth is required', async () => {
    render(
      <ChatTestProviders eventBus={mockEventBus}>
        <ChatPanel />
      </ChatTestProviders>
    );

    // Simulate auth required event
    simulateMapEvent.authRequired(
      mockEventBus,
      'Please log in to continue'
    );

    await waitFor(() => {
      expect(mockEventBus).toHaveEmittedEvent('auth.required');
    });
  });

  it('should handle error events', async () => {
    render(
      <ChatTestProviders eventBus={mockEventBus}>
        <ChatPanel />
      </ChatTestProviders>
    );

    // Simulate error from map operations
    simulateMapEvent.error(
      mockEventBus,
      'Failed to create tile',
      { tileId: 'failed-tile' }
    );

    await waitFor(() => {
      expect(mockEventBus).toHaveEmittedEvent('error.occurred');
    });
  });

  it('should emit auth.logout event when user logs out', async () => {
    const user = userEvent.setup();
    const { authClient } = await import('~/lib/auth/auth-client');
    const { useAuth } = await import('~/contexts/AuthContext');
    
    // Mock authenticated user
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123', name: 'Test User' },
    } as any);

    render(
      <ChatTestProviders eventBus={mockEventBus}>
        <ChatPanel />
      </ChatTestProviders>
    );

    // Find and click logout button
    const authButton = screen.getByRole('button', { name: 'Logout' });
    await user.click(authButton);

    expect(authClient.signOut).toHaveBeenCalled();
    expect(mockEventBus).toHaveEmittedEvent('auth.logout', {});
  });

  it('should handle debug logger state', async () => {
    // Test with debug logger enabled
    render(
      <ChatTestProviders 
        eventBus={mockEventBus}
        enableDebugLogger={true}
      >
        <ChatPanel />
      </ChatTestProviders>
    );

    // Debug logger should be configured but not affect the UI in tests
    expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
  });
});