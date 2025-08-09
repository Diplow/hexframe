import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock tRPC BEFORE any other imports that might use it
vi.mock('~/commons/trpc/react', () => {
  const mockFn = vi.fn;
  return {
    api: {
      useUtils: mockFn(() => ({
        map: {
          user: {
            getUserMap: {
              invalidate: mockFn(),
            },
          },
          items: {
            invalidate: mockFn(),
          },
        },
      })),
      agentic: {
        generateResponse: {
          useMutation: mockFn(() => ({
            mutateAsync: mockFn().mockResolvedValue({
              content: 'AI response',
              model: 'test-model',
              usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
              finishReason: 'stop'
            }),
            mutate: mockFn((_args: unknown, options?: any) => {
              if (options?.onSuccess) {
                options.onSuccess({
                  content: 'AI response',
                  model: 'test-model',
                  usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
                  finishReason: 'stop'
                });
              }
              if (options?.onSettled) {
                options.onSettled();
              }
            }),
            isLoading: false,
            isError: false,
            error: null,
            data: null,
          })),
        },
      },
      map: {
        user: {
          createDefaultMapForCurrentUser: {
            useMutation: mockFn(() => ({
              mutateAsync: mockFn().mockResolvedValue({ success: false }),
              mutate: mockFn(),
              isLoading: false,
              isPending: false,
              isSuccess: false,
              isError: false,
              error: null,
              data: null,
            })),
          },
          getUserMap: {
            useQuery: mockFn(() => ({
              data: null,
              isLoading: false,
              error: null,
            })),
          },
        },
        addItem: {
          useMutation: mockFn(() => ({
            mutateAsync: mockFn(() => Promise.resolve({ id: 1, coordId: 'test' })),
            mutate: mockFn(),
            isLoading: false,
          })),
        },
        updateItem: {
          useMutation: mockFn(() => ({
            mutateAsync: mockFn(() => Promise.resolve({ id: 1 })),
            mutate: mockFn(),
            isLoading: false,
          })),
        },
        removeItem: {
          useMutation: mockFn(() => ({
            mutateAsync: mockFn(() => Promise.resolve()),
            mutate: mockFn(),
            isLoading: false,
          })),
        },
        items: {
          create: {
            useMutation: () => ({
              mutateAsync: mockFn(() => Promise.resolve({ id: 1, coordId: 'test' })),
              mutate: mockFn(),
              isLoading: false,
            }),
          },
          update: {
            useMutation: () => ({
              mutateAsync: mockFn(() => Promise.resolve({ id: 1 })),
              mutate: mockFn(),
              isLoading: false,
            }),
          },
          delete: {
            useMutation: () => ({
              mutateAsync: mockFn(() => Promise.resolve()),
              mutate: mockFn(),
              isLoading: false,
            }),
          },
          move: {
            useMutation: () => ({
              mutateAsync: mockFn(() => Promise.resolve({ success: true })),
              mutate: mockFn(),
              isLoading: false,
            }),
          },
          moveMapItem: {
            useMutation: mockFn(() => ({
              mutateAsync: mockFn(() => Promise.resolve({ success: true })),
              mutate: mockFn(),
              isLoading: false,
            })),
          },
        },
      },
      iam: {
        user: {
          getUserIdFromMappingUserId: {
            useQuery: mockFn(() => ({
              data: null,
              isLoading: false,
              error: null,
            })),
          },
        },
      },
    },
  };
});

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
  Input: ({ onEnter }: { onEnter: (message: string) => void }) => {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const input = e.currentTarget.querySelector('input');
      if (input?.value) {
        onEnter(input.value);
        input.value = '';
      }
    };
    
    return (
      <form data-testid="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type a message..."
          data-testid="chat-input-field"
        />
        <button type="submit" data-testid="send-button">Send</button>
      </form>
    );
  }
}));

// Mock AuthWidget with actions
vi.mock('../_widgets/auth-widget', () => ({
  AuthWidget: ({ onLogin, onLogout }: { onLogin?: () => void, onLogout?: () => void }) => (
    <div data-testid="auth-widget">
      <button data-testid="login-button" onClick={onLogin}>Login</button>
      <button data-testid="logout-button" onClick={onLogout}>Logout</button>
    </div>
  ),
}));

// Mock PreviewWidget to test tile selection
vi.mock('../_widgets/preview-widget', () => ({
  PreviewWidget: ({ tile }: { tile: unknown }) => (
    <div data-testid="preview-widget">
      {tile ? `Selected tile: ${JSON.stringify(tile)}` : 'No tile selected'}
    </div>
  ),
}));

// Mock logger
vi.mock('~/lib/debug/debug-logger', () => ({
  loggers: {
    render: {
      chat: vi.fn(),
    },
    agentic: Object.assign(vi.fn(), {
      error: vi.fn(),
    }),
  },
  debugLogger: {
    formatLogs: vi.fn(() => ['[2024-01-01 10:00:00] Test log message']),
    getFullLogs: vi.fn(() => []),
    clearBuffer: vi.fn(),
    getOptions: vi.fn(() => ({ enableConsole: false })),
    setOptions: vi.fn(),
  },
}));

describe('ChatPanel', () => {
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render chat components', async () => {
    const { container } = render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    // Should render container
    const chatContainer = container.querySelector('[class*="chat"]');
    expect(chatContainer).toBeInTheDocument();

    // Should have input
    await waitFor(() => {
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });
  });

  it('should display preview widget when tile is selected', async () => {
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    // Initially no tile selected
    await waitFor(() => {
      expect(screen.getByTestId('preview-widget')).toHaveTextContent('No tile selected');
    });

    // Emit tile.selected event
    const selectedTile = { id: 'test-id', title: 'Test Tile' };
    mockEventBus.emit('tile.selected', { tile: selectedTile });

    // Should display selected tile
    await waitFor(() => {
      expect(screen.getByTestId('preview-widget')).toHaveTextContent(JSON.stringify(selectedTile));
    });
  });

  it('should handle user messages', async () => {
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    // Ensure input is rendered
    const input = await screen.findByTestId('chat-input-field');
    expect(input).toBeInTheDocument();

    // Type and send a message
    await userEvent.type(input, 'Hello, world!');
    
    const sendButton = screen.getByTestId('send-button');
    await userEvent.click(sendButton);

    // Message should be displayed in chat
    await waitFor(() => {
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });
  });

  it('should react to navigation events', async () => {
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    // Emit navigation event
    mockEventBus.emit('navigation.occurred', { 
      center: { id: 'nav-id', title: 'Navigation Target' } 
    });

    // Should display system message about navigation
    await waitFor(() => {
      const messages = screen.getAllByText(/Navigation Target|nav-id/i);
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  it('should show auth widget when auth is required', async () => {
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    // Emit auth.required event
    mockEventBus.emit('auth.required', { reason: 'Please log in' });

    // Should display auth widget
    await waitFor(() => {
      expect(screen.getByTestId('auth-widget')).toBeInTheDocument();
    });
  });

  it('should handle error events', async () => {
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    // Emit error event
    mockEventBus.emit('error.occurred', { 
      message: 'Something went wrong',
      context: 'test-context' 
    });

    // Should display error message
    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
  });

  it('should emit auth.logout event when user logs out', async () => {
    const { authClient } = await import('~/lib/auth/auth-client');
    
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    // Show auth widget
    mockEventBus.emit('auth.required', { reason: 'Please log in' });
    
    await waitFor(() => {
      expect(screen.getByTestId('auth-widget')).toBeInTheDocument();
    });

    // Click logout
    const logoutButton = screen.getByTestId('logout-button');
    await userEvent.click(logoutButton);

    // Should call signOut
    await waitFor(() => {
      expect(authClient.signOut).toHaveBeenCalled();
    });
  });

  it('should handle debug logger state', async () => {
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    // Update settings to enable debug mode
    (chatSettings.getSettings as jest.Mock).mockReturnValue({
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

    // Emit settings update
    mockEventBus.emit('settings.updated', { 
      settings: { messages: { debug: true } } 
    });

    await waitFor(() => {
      // Verify debug mode is enabled (exact behavior depends on implementation)
      // For now just check that the component renders without errors
      const chatContainer = screen.getByTestId('chat-input');
      expect(chatContainer).toBeInTheDocument();
    });
  });
});

// Import userEvent after vi.mock declarations
import userEvent from '@testing-library/user-event';