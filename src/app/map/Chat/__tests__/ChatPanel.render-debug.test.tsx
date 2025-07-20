import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../ChatPanel';
import { TestProviders } from '~/test-utils/providers';
import { createMockEventBus } from '~/test-utils/event-bus';
import type { ChatSettings } from '../_settings/chat-settings';

// Track all renders
let renderLogs: string[] = [];

// Mock minimal dependencies
vi.mock('../_settings/chat-settings', () => ({
  chatSettings: {
    getSettings: vi.fn(() => ({
      messages: { 
        debug: false,
        tile: { edit: true, create: true, delete: true, move: true, swap: true }
      },
    })),
    subscribe: vi.fn((callback: (settings: ChatSettings) => void) => {
      callback({
        messages: { 
          debug: false,
          tile: { edit: true, create: true, delete: true, move: true, swap: true }
        },
      });
      return () => {
        // Cleanup function
      };
    }),
  },
}));

vi.mock('~/lib/auth/auth-client', () => ({
  authClient: {
    signOut: vi.fn(),
    useSession: {
      get: vi.fn(() => ({ user: null })),
      subscribe: vi.fn(() => () => {
        // Cleanup function
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
      mappingUserId: null,
      isLoading: false,
      setMappingUserId: vi.fn(),
    })),
  };
});

vi.mock('~/commons/trpc/react', () => ({
  api: {
    useUtils: vi.fn(() => ({
      map: {
        user: {
          getUserMap: { fetch: vi.fn().mockResolvedValue({ success: false }) },
          createDefaultMapForCurrentUser: { mutateAsync: vi.fn().mockResolvedValue({ success: false }) },
        },
      },
    })),
    map: {
      user: {
        createDefaultMapForCurrentUser: {
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn().mockResolvedValue({ success: false }),
            mutate: vi.fn(),
            isPending: false,
            isError: false,
            error: null,
            data: null,
          })),
        },
      },
    },
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

// Track renders of Messages component
vi.mock('../Messages/index.tsx', () => ({
  Messages: ({ messages, widgets }: { messages: unknown[]; widgets: unknown[] }) => {
    renderLogs.push(`Messages rendered: ${messages.length} messages, ${widgets.length} widgets`);
    return (
      <div data-testid="chat-messages">
        <div data-testid="message-count">Messages: {messages.length}</div>
        <div data-testid="widget-count">Widgets: {widgets.length}</div>
        {messages.map((msg: any, idx) => (
          <div key={msg.id || idx} data-testid={`message-${idx}`}>
            {msg.actor}: {msg.content}
          </div>
        ))}
      </div>
    );
  },
}));

// Track renders of Input component
vi.mock('../Input/index.tsx', () => ({
  Input: () => {
    renderLogs.push('Input rendered');
    return (
      <div>
        <input data-testid="chat-input" placeholder="Type a message..." />
        <button data-testid="send-button">Send</button>
      </div>
    );
  },
}));

describe('ChatPanel - Render Debug', () => {
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let user: ReturnType<typeof userEvent.setup>;

  function renderWithProviders(ui: React.ReactElement) {
    return render(
      <TestProviders mockEventBus={mockEventBus}>
        {ui}
      </TestProviders>
    );
  }

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    user = userEvent.setup();
    vi.clearAllMocks();
    renderLogs = [];
  });

  afterEach(() => {
    cleanup();
    console.log('=== RENDER LOGS ===');
    renderLogs.forEach((log, i) => console.log(`${i}: ${log}`));
  });

  it('should update message count when sending messages', async () => {
    renderWithProviders(<ChatPanel />);
    
    // Check initial state
    const messageCount = screen.getByTestId('message-count');
    expect(messageCount).toHaveTextContent('Messages: 1'); // Welcome message
    
    // Send a message
    const input = screen.getByTestId('chat-input');
    await user.type(input, 'Test message');
    await user.click(screen.getByTestId('send-button'));
    
    // Check if message count increased
    await waitFor(() => {
      expect(messageCount).toHaveTextContent('Messages: 2');
    }, { timeout: 5000 });
    
    // Check if the message is displayed
    const sentMessage = screen.getByTestId('message-1');
    expect(sentMessage).toHaveTextContent('user: Test message');
  });
});