import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../ChatPanel';
import { TestProviders } from '~/test-utils/providers';
import { createMockEventBus } from '~/test-utils/event-bus';
import { api } from '~/commons/trpc/react';

// Mock only external dependencies
// =================================

// Mock tRPC with proper structure
vi.mock('~/commons/trpc/react', () => ({
  api: {
    // Provide complete agentic structure
    agentic: {
      generateResponse: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn((_args: unknown, options?: {
            onSuccess?: (data: unknown) => void;
            onSettled?: () => void;
            onError?: (error: Error) => void;
          }) => {
            // Simulate async AI response
            setTimeout(() => {
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
            }, 0);
          }),
          mutateAsync: vi.fn().mockResolvedValue({
            content: 'AI response',
            model: 'test-model',
            usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
            finishReason: 'stop'
          }),
          isLoading: false,
          isError: false,
          error: null,
          data: undefined,
        })),
      },
    },
    // Map-related APIs
    map: {
      user: {
        createDefaultMapForCurrentUser: {
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn().mockResolvedValue({ success: true }),
            mutate: vi.fn(),
            isLoading: false,
            isPending: false,
            isSuccess: false,
            isError: false,
            error: null,
            data: undefined,
          })),
        },
        getUserMap: {
          useQuery: vi.fn(() => ({
            data: undefined,
            isLoading: false,
            error: null,
          })),
        },
      },
      addItem: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn().mockResolvedValue({ id: 1, coordId: 'test' }),
          mutate: vi.fn(),
          isLoading: false,
        })),
      },
      updateItem: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
          mutate: vi.fn(),
          isLoading: false,
        })),
      },
      removeItem: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn().mockResolvedValue(undefined),
          mutate: vi.fn(),
          isLoading: false,
        })),
      },
      items: {
        create: {
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn().mockResolvedValue({ id: 1, coordId: 'test' }),
            mutate: vi.fn(),
            isLoading: false,
          })),
        },
        update: {
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn().mockResolvedValue({ id: 1 }),
            mutate: vi.fn(),
            isLoading: false,
          })),
        },
        delete: {
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn().mockResolvedValue(undefined),
            mutate: vi.fn(),
            isLoading: false,
          })),
        },
        move: {
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn().mockResolvedValue({ success: true }),
            mutate: vi.fn(),
            isLoading: false,
          })),
        },
        moveMapItem: {
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn().mockResolvedValue({ success: true }),
            mutate: vi.fn(),
            isLoading: false,
          })),
        },
      },
    },
    // IAM-related APIs
    iam: {
      user: {
        getUserIdFromMappingUserId: {
          useQuery: vi.fn(() => ({
            data: undefined,
            isLoading: false,
            error: null,
          })),
        },
      },
    },
    // Utils
    useUtils: vi.fn(() => ({
      map: {
        user: {
          getUserMap: {
            invalidate: vi.fn(),
            fetch: vi.fn().mockResolvedValue({ success: false }),
          },
        },
        items: {
          invalidate: vi.fn(),
        },
      },
    })),
  },
}));

// Mock authentication client
vi.mock('~/lib/auth/auth-client', () => ({
  authClient: {
    signOut: vi.fn(),
    signIn: vi.fn(),
    useSession: {
      get: vi.fn(() => ({
        user: null,
        session: null,
      })),
      subscribe: vi.fn(() => {
        // Return unsubscribe function
        return () => { /* cleanup */ };
      }),
    },
  },
}));

// Mock auth context with minimal implementation
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

// Mock unified auth context
vi.mock('~/contexts/UnifiedAuthContext', () => ({
  useUnifiedAuth: vi.fn(() => ({
    user: null,
    isLoading: false,
  })),
}));

// Mock chat settings with complete interface
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
    subscribe: vi.fn((callback: (settings: unknown) => void) => {
      // Call callback immediately with settings
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
      return () => { /* cleanup */ };
    }),
  },
}));

// Mock debug logger
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
    formatLogs: vi.fn(() => []),
    getFullLogs: vi.fn(() => []),
    clearBuffer: vi.fn(),
    getOptions: vi.fn(() => ({ enableConsole: false })),
    setOptions: vi.fn(),
  },
}));

// Mock map cache context to provide required context
vi.mock('../../Cache/_hooks/use-cache-context', () => ({
  useMapCacheContext: vi.fn(() => ({
    state: {
      currentCenter: 'center-tile-id',
      itemsById: {
        'center-tile-id': {
          metadata: {
            coordId: 'center-tile-id',
            coordinates: { q: 0, r: 0 },
            depth: 0,
            parentId: null,
          },
          data: {
            name: 'Center Tile',
            description: 'Test tile',
            url: '',
            color: '#000000',
          },
        },
      },
    },
    actions: {
      selectTile: vi.fn(),
    },
  })),
  useMapCacheContextSafe: vi.fn(() => ({
    state: {
      currentCenter: 'center-tile-id',
      itemsById: {
        'center-tile-id': {
          metadata: {
            coordId: 'center-tile-id',
            coordinates: { q: 0, r: 0 },
            depth: 0,
            parentId: null,
          },
          data: {
            name: 'Center Tile',
            description: 'Test tile',
            url: '',
            color: '#000000',
          },
        },
      },
    },
    actions: {
      selectTile: vi.fn(),
    },
  })),
}));

// DON'T mock internal components - let them render naturally
// No mocking of: Input, Messages, or internal widgets

describe('ChatPanel', () => {
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render chat components', () => {
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    // Check main container
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
    
    // Check header elements
    expect(screen.getByText('Hex')).toBeInTheDocument();
    expect(screen.getByText('Frame')).toBeInTheDocument();
    
    // Check messages area
    expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    
    // Check that Input renders (it will render its own structure)
    // The Input component creates a textarea, not an input field
    const textbox = screen.getByRole('textbox');
    expect(textbox).toBeInTheDocument();
  });

  it('should handle user messages', async () => {
    const user = userEvent.setup();
    
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    // Find the textarea (Input component uses textarea, not input)
    const textbox = screen.getByRole('textbox');
    
    // Type a message
    await user.type(textbox, 'Test message');
    
    // Submit with Enter
    await user.keyboard('{Enter}');
    
    // Wait for message to appear
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('should display system messages', () => {
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    // Check for welcome message
    expect(screen.getByText(/Welcome to/)).toBeInTheDocument();
  });

  it('should handle authentication button clicks', async () => {
    const user = userEvent.setup();
    
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    // Find login button (when user is not logged in)
    const authButton = screen.getByLabelText('Login');
    expect(authButton).toBeInTheDocument();
    
    // Click login button
    await user.click(authButton);
    
    // Should emit auth.required event
    await waitFor(() => {
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth.required',
        })
      );
    });
  });

  it('should integrate with AI for message processing', async () => {
    const user = userEvent.setup();
    
    // Track if the mutation was called
    const generateResponseMock = vi.fn();
    
    // Override the mutation mock for this test  
    vi.mocked(api.agentic.generateResponse.useMutation).mockReturnValue({
      mutate: generateResponseMock,
      mutateAsync: vi.fn().mockResolvedValue({
        content: 'AI response',
        model: 'test-model',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        finishReason: 'stop' as const
      }),
      isLoading: false,
      isError: false,
      error: null,
      data: undefined,
    } as unknown as ReturnType<typeof api.agentic.generateResponse.useMutation>)
    
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    const textbox = screen.getByRole('textbox');
    
    // Type a message that will trigger AI
    await user.type(textbox, 'Hello AI');
    await user.keyboard('{Enter}');
    
    // Wait for user message to appear
    await waitFor(() => {
      expect(screen.getByText('Hello AI')).toBeInTheDocument();
    });
    
    // The AI integration should attempt to call the mutation
    // Note: The actual response display is handled by the mutation's onSuccess callback
    // which is defined in the global mock. For this test, we just verify the integration
    // triggers the AI call.
    await waitFor(() => {
      expect(generateResponseMock).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('should handle command input', async () => {
    const user = userEvent.setup();
    
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    const textbox = screen.getByRole('textbox');
    
    // Type a command
    await user.type(textbox, '/help');
    await user.keyboard('{Enter}');
    
    // Command should be processed (exact behavior depends on command implementation)
    await waitFor(() => {
      // Commands starting with "/" might show different behavior
      // We just verify the input was processed
      expect(textbox).toHaveValue('');
    });
  });

  it('should show thinking indicator when AI is processing', async () => {
    const user = userEvent.setup();
    
    render(
      <TestProviders mockEventBus={mockEventBus}>
        <ChatPanel />
      </TestProviders>
    );

    const textbox = screen.getByRole('textbox');
    
    // Send a message
    await user.type(textbox, 'Test');
    await user.keyboard('{Enter}');
    
    // Should show thinking message (there might be multiple)
    await waitFor(() => {
      const thinkingElements = screen.getAllByText('Thinking...');
      expect(thinkingElements.length).toBeGreaterThan(0);
    });
  });
});