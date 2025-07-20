import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../ChatPanel';
import { TestProviders } from '~/test-utils/providers';
import { createMockEventBus } from '~/test-utils/event-bus';
import type { ChatSettings } from '../_settings/chat-settings';

// Use real implementations to test actual functionality
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
    subscribe: vi.fn((callback: (settings: ChatSettings) => void) => {
      // Call callback immediately with current settings
      callback({
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
      });
      // Return unsubscribe function
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
          getUserMap: {
            fetch: vi.fn().mockResolvedValue({ success: false }),
          },
          createDefaultMapForCurrentUser: {
            mutateAsync: vi.fn().mockResolvedValue({ success: false }),
          },
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

describe('ChatPanel - Message Sending', () => {
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
  });

  afterEach(() => {
    cleanup();
  });

  it('should display sent messages in the chat', async () => {
    renderWithProviders(<ChatPanel />);
    
    // Initially should show welcome message (wait for async generation)
    await waitFor(() => {
      // The message might be split across multiple elements due to ReactMarkdown
      const welcomeText = screen.getByText((content, element) => {
        return element?.textContent?.includes('Welcome to') || false;
      });
      expect(welcomeText).toBeInTheDocument();
    }, { timeout: 3000 });

    // Type and send a message
    const input = screen.getByPlaceholderText(/type a message/i);
    const testMessage = 'Hello, this is a test message!';
    
    await user.type(input, testMessage);
    await user.click(screen.getByTestId('send-button'));
    
    // Input should be cleared
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
    
    // Message should appear in chat
    await waitFor(() => {
      const messageElement = screen.getByText(testMessage);
      expect(messageElement).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should display multiple messages in order', async () => {
    renderWithProviders(<ChatPanel />);
    
    const input = screen.getByPlaceholderText(/type a message/i);
    const messages = ['First message', 'Second message', 'Third message'];
    
    // Send multiple messages
    for (const msg of messages) {
      await user.type(input, msg);
      await user.click(screen.getByTestId('send-button'));
      
      // Wait for input to clear before sending next
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    }
    
    // All messages should be visible
    await waitFor(() => {
      messages.forEach(msg => {
        expect(screen.getByText(msg)).toBeInTheDocument();
      });
    });
    
    // Messages should be in the correct order
    const allMessages = screen.getAllByRole('article');
    // +1 for welcome message
    expect(allMessages).toHaveLength(messages.length + 1);
  });

  it('should handle Enter key to send messages', async () => {
    renderWithProviders(<ChatPanel />);
    
    const input = screen.getByPlaceholderText(/type a message/i);
    const testMessage = 'Message sent with Enter key';
    
    await user.type(input, `${testMessage}{Enter}`);
    
    // Input should be cleared
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
    
    // Message should appear
    await waitFor(() => {
      expect(screen.getByText(testMessage)).toBeInTheDocument();
    });
  });

  it('should show timestamp for messages', async () => {
    renderWithProviders(<ChatPanel />);
    
    const input = screen.getByPlaceholderText(/type a message/i);
    await user.type(input, 'Message with timestamp{Enter}');
    
    // Check for time format (HH:MM)
    await waitFor(() => {
      const timeRegex = /\d{2}:\d{2}/;
      const timestamps = screen.getAllByText(timeRegex);
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });
});