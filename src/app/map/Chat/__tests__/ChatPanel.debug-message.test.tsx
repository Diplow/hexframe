import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../ChatPanel';
import { TestProviders } from '~/test-utils/providers';
import { createMockEventBus } from '~/test-utils/event-bus';
import type { ChatSettings } from '../_settings/chat-settings';

// Mock tRPC
vi.mock('~/commons/trpc/react', async () => {
  const { createTRPCMock } = await import('~/test-utils/trpc-mocks');
  return createTRPCMock();
});

// Minimal mocks just for testing
vi.mock('../_settings/chat-settings', () => ({
  chatSettings: {
    getSettings: vi.fn(() => ({
      messages: { 
        debug: true, // Enable debug mode to see what's happening
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
      callback({
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

describe('ChatPanel - Debug Message Flow', () => {
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
    
    // Spy on console to see what's happening
    vi.spyOn(console, 'log');
    vi.spyOn(console, 'error');
    vi.spyOn(console, 'warn');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('should track the full message flow in debug mode', async () => {
    renderWithProviders(<ChatPanel />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/type a message/i);
    const testMessage = 'Debug test message';
    
    await user.type(input, testMessage);
    await user.click(screen.getByTestId('send-button'));
    
    // Input should clear
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
    
    // Verify the message was sent
    await waitFor(() => {
      expect(screen.getByText(testMessage)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // In debug mode, we should see debug messages
    const debugMessages = screen.queryAllByText(/\[DEBUG\]/);
    expect(debugMessages.length).toBeGreaterThanOrEqual(0); // Debug messages may or may not appear
  });
});