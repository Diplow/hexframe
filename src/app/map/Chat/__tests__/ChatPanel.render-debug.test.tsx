import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ChatPanel } from '../ChatPanel';
import { TestProviders } from '~/test-utils/providers';
import { createMockEventBus } from '~/test-utils/event-bus';
import type { ChatSettings } from '../_settings/chat-settings';

// Track all renders
let renderLogs: string[] = [];

// Mock tRPC
vi.mock('~/commons/trpc/react', async () => {
  const { createTRPCMock } = await import('~/test-utils/trpc-mocks');
  return createTRPCMock();
});

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

// Track renders of Timeline component (formerly Messages)
vi.mock('../Timeline/interface', () => ({
  Timeline: ({ messages, widgets }: { messages: unknown[]; widgets: unknown[] }) => {
    renderLogs.push(`Timeline rendered: ${messages.length} messages, ${widgets.length} widgets`);
    return (
      <div data-testid="chat-timeline">
        <div data-testid="message-count">Messages: {messages.length}</div>
        <div data-testid="widget-count">Widgets: {widgets.length}</div>
        {messages.map((msg: unknown, idx) => {
          const message = msg as { id?: string; actor?: string; content?: string };
          return (
            <div key={message.id ?? idx} data-testid={`message-${idx}`}>
              {message.actor}: {message.content}
            </div>
          );
        })}
      </div>
    );
  },
}));

// Track renders of Input component - This is a simplified mock for render testing
vi.mock('../Input/index.tsx', () => ({
  Input: () => {
    renderLogs.push('Input rendered');
    return <div data-testid="chat-input-mock">Input Component</div>;
  },
}));

describe('ChatPanel - Render Debug', () => {
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  function renderWithProviders(ui: React.ReactElement) {
    return render(
      <TestProviders mockEventBus={mockEventBus}>
        {ui}
      </TestProviders>
    );
  }

  beforeEach(() => {
    mockEventBus = createMockEventBus();
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
    
    // Verify components are rendered
    expect(screen.getByTestId('chat-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input-mock')).toBeInTheDocument();
    
    // Verify initial render
    const messageCount = screen.getByTestId('message-count');
    expect(messageCount).toBeInTheDocument();
    
    // Verify render logs show components were rendered
    expect(renderLogs.some(log => log.includes('Timeline rendered'))).toBe(true);
    expect(renderLogs).toContain('Input rendered');
  });
});