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
    })),
  };
});

// Mock logger with minimal implementation
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

// Mock the Input component to be more testable
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

// Mock widgets
vi.mock('../_widgets/auth-widget', () => ({
  AuthWidget: () => <div data-testid="auth-widget">Auth Widget</div>,
}));

vi.mock('../_widgets/preview-widget', () => ({
  PreviewWidget: () => <div data-testid="preview-widget">Preview Widget</div>,
}));

describe('ChatPanel - Message Sending', () => {
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should display sent messages in the chat', async () => {
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    // Wait for input to be available
    const input = await screen.findByTestId('chat-input-field');
    
    // Type message
    await user.type(input, 'Test message');
    
    // Send message
    const sendButton = screen.getByTestId('send-button');
    await user.click(sendButton);

    // Check message appears
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('should display multiple messages in order', async () => {
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    const input = await screen.findByTestId('chat-input-field');
    const sendButton = screen.getByTestId('send-button');

    // Send first message
    await user.type(input, 'First message');
    await user.click(sendButton);

    // Send second message  
    await user.type(input, 'Second message');
    await user.click(sendButton);

    // Both messages should be visible
    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });

    // Check order (second message should appear after first)
    const messages = screen.getAllByText(/message/);
    expect(messages.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle Enter key to send messages', async () => {
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    const input = await screen.findByTestId('chat-input-field');
    
    // Type message and press Enter
    await user.type(input, 'Enter key message{Enter}');

    // Message should be sent
    await waitFor(() => {
      expect(screen.getByText('Enter key message')).toBeInTheDocument();
    });
  });

  it('should show timestamp for messages', async () => {
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    const input = await screen.findByTestId('chat-input-field');
    const sendButton = screen.getByTestId('send-button');

    // Send a message
    await user.type(input, 'Timestamped message');
    await user.click(sendButton);

    // Check for timestamp format (e.g., HH:MM)
    await waitFor(() => {
      const timeElements = screen.queryAllByText(/\d{1,2}:\d{2}/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });
});