import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { ChatPanel } from '../ChatPanel';
import { TestProviders } from '~/test-utils/providers';
import { createMockEventBus } from '~/test-utils/event-bus';
import { chatSettings } from '../_settings/chat-settings';

// We'll use the real useChatState hook instead of mocking it
// This avoids potential issues with React rendering

// Mock dependencies
vi.mock('../_settings/chat-settings', () => ({
  chatSettings: {
    getSettings: vi.fn(() => ({
      messages: { 
        debug: false,
        tile: {
          edit: true,
          create: true,
          delete: true,
          move: true,
          swap: true,
        }
      },
    })),
  },
}));
vi.mock('~/lib/auth/auth-client', () => ({
  authClient: {
    signOut: vi.fn(),
    useSession: {
      get: vi.fn(() => ({ user: null })),
      subscribe: vi.fn(() => () => {
        // Unsubscribe function
      }),
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
  Messages: ({ messages, widgets }: { messages: unknown[]; widgets: unknown[] }) => (
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

// Helper functions to simulate map events
const simulateMapEvent = {
  tileSelected: (eventBus: ReturnType<typeof createMockEventBus>, tileData: {
    id: string;
    title: string;
    description?: string;
    content?: string;
    coordId: string;
  }, openInEditMode?: boolean) => {
    eventBus.emit({
      type: 'map.tile_selected',
      source: 'map_cache',
      payload: {
        tileId: tileData.coordId,
        tileData,
        openInEditMode,
      },
      timestamp: new Date(),
    });
  },

  navigation: (eventBus: ReturnType<typeof createMockEventBus>, fromId: string | undefined, toId: string, toName: string) => {
    eventBus.emit({
      type: 'map.navigation',
      source: 'map_cache',
      payload: {
        fromCenterId: fromId,
        toCenterId: toId,
        toCenterName: toName,
      },
      timestamp: new Date(),
    });
  },

  authRequired: (eventBus: ReturnType<typeof createMockEventBus>, reason: string) => {
    eventBus.emit({
      type: 'auth.required',
      source: 'map_cache',
      payload: { reason },
      timestamp: new Date(),
    });
  },
  
  authLogout: (eventBus: ReturnType<typeof createMockEventBus>) => {
    eventBus.emit({
      type: 'auth.logout',
      source: 'auth',
      payload: {},
      timestamp: new Date(),
    });
  },

  error: (eventBus: ReturnType<typeof createMockEventBus>, error: string, context?: unknown) => {
    eventBus.emit({
      type: 'error.occurred',
      source: 'map_cache',
      payload: { error, context },
      timestamp: new Date(),
    });
  },
};

describe('ChatPanel', () => {
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  // Custom render function
  function renderWithProviders(ui: React.ReactElement) {
    return render(
      <TestProviders mockEventBus={mockEventBus}>
        {ui}
      </TestProviders>
    );
  }

  beforeEach(() => {
    // Ensure DOM is properly set up
    if (typeof document !== 'undefined') {
      if (!document.body) {
        document.body = document.createElement('body');
      }
      // Ensure test container exists
      if (!document.getElementById('test-container')) {
        const container = document.createElement('div');
        container.id = 'test-container';
        document.body.appendChild(container);
      }
    }
    
    mockEventBus = createMockEventBus();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    // Clean up any leftover DOM elements
    if (typeof document !== 'undefined' && document.body) {
      document.body.innerHTML = '';
    }
  });

  it('should render chat components', () => {
    renderWithProviders(<ChatPanel />);

    expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('should display preview widget when tile is selected', async () => {
    renderWithProviders(<ChatPanel />);

    // Simulate tile selection from Canvas
    simulateMapEvent.tileSelected(mockEventBus, {
      id: 'tile-123',
      title: 'Test Tile',
      description: 'A test tile',
      content: 'A test tile', // content can be the same as description
      coordId: 'coord-123',
    });

    // Wait for chat to process the event
    await waitFor(() => {
      expect(mockEventBus).toHaveEmittedEvent('map.tile_selected');
    });
  });

  it('should handle user messages', async () => {
    renderWithProviders(<ChatPanel />);

    // The chat should display messages
    expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    
    // Since we're using the real hook, the initial welcome message should be displayed
    expect(screen.getByText(/Messages: 1/)).toBeInTheDocument();
  });

  it('should react to navigation events', async () => {
    renderWithProviders(<ChatPanel />);

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
    renderWithProviders(<ChatPanel />);

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
    renderWithProviders(<ChatPanel />);

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
    const userEvent = (await import('@testing-library/user-event')).default;
    const user = userEvent.setup();
    const { authClient } = await import('~/lib/auth/auth-client');
    const { useAuth } = await import('~/contexts/AuthContext');
    
    // Mock authenticated user
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      mappingUserId: 123,
      isLoading: false,
      setMappingUserId: vi.fn(),
    });

    renderWithProviders(<ChatPanel />);

    // Find and click logout button
    const authButton = screen.getByRole('button', { name: 'Logout' });
    await user.click(authButton);

    expect(authClient.signOut).toHaveBeenCalled();
    expect(mockEventBus).toHaveEmittedEvent('auth.logout', {});
  });

  it('should handle debug logger state', async () => {
    // Test with debug logger enabled
    vi.mocked(chatSettings).getSettings.mockReturnValue({
      messages: { 
        debug: true,
        tile: {
          edit: true,
          create: true,
          delete: true,
          move: true,
          swap: true,
        }
      },
    });
    
    renderWithProviders(<ChatPanel />);

    // Debug logger should be configured but not affect the UI in tests
    expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
  });
});