import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../ChatPanel';
import { TestProviders } from '~/test-utils/providers';
import { createMockEventBus } from '~/test-utils/event-bus';
import type { ChatSettings } from '../_settings/chat-settings';

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
    
    console.log('=== SENDING MESSAGE ===');
    await user.type(input, testMessage);
    await user.click(screen.getByTestId('send-button'));
    
    // Input should clear
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
    
    console.log('=== CHECKING FOR DEBUG EVENTS ===');
    // With debug mode on, we should see debug events
    await waitFor(() => {
      const debugMessages = screen.queryAllByText(/\[DEBUG\]/);
      console.log('Debug messages found:', debugMessages.length);
      debugMessages.forEach((msg, i) => {
        console.log(`Debug message ${i}:`, msg.textContent);
      });
    });
    
    console.log('=== CHECKING FOR USER MESSAGE ===');
    // Look for the actual message in the DOM
    const messagesContainer = screen.getByTestId('chat-messages');
    console.log('Messages container content:', messagesContainer.textContent);
    
    // Try to find our test message
    const messageFound = screen.queryByText(testMessage);
    console.log('Test message found:', !!messageFound);
    
    // Look for any message-like content
    const allTextContent = messagesContainer.querySelectorAll('span, div');
    console.log('All text elements:', allTextContent.length);
    allTextContent.forEach((el, i) => {
      if (el.textContent?.trim()) {
        console.log(`Text ${i}:`, el.textContent.trim());
      }
    });
    
    // Check what events were emitted
    console.log('=== EVENT BUS EVENTS ===');
    // The mockEventBus should track emitted events
    // Let's check if any events were registered
    console.log('Event bus:', mockEventBus);
    
    // Since debug mode is on, let's wait a bit to see if any debug messages appear
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check again for any changes
    console.log('=== FINAL CHECK ===');
    console.log('Messages container after wait:', messagesContainer.textContent);
    const finalMessageFound = screen.queryByText(testMessage);
    console.log('Test message found after wait:', !!finalMessageFound);
  });
});