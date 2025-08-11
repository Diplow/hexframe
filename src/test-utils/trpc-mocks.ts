import { vi } from 'vitest';

export const createTRPCMock = () => ({
  api: {
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
    iam: {
      user: {
        getUserIdFromMappingUserId: {
          useQuery: vi.fn(() => ({
            data: null,
            isLoading: false,
            error: null,
          })),
        },
      },
    },
    agentic: {
      generateResponse: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn().mockResolvedValue({
            content: 'AI response',
            model: 'test-model',
            usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
            finishReason: 'stop'
          }),
          mutate: vi.fn((
            _args: unknown, 
            options?: {
              onSuccess?: (data: {
                content: string;
                model: string;
                usage: { promptTokens: number; completionTokens: number; totalTokens: number };
                finishReason: string;
              }) => void;
              onSettled?: () => void;
              onError?: (error: Error) => void;
            }
          ) => {
            // Simulate successful response
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
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn().mockResolvedValue({ success: false }),
            mutate: vi.fn(),
            isLoading: false,
            isPending: false,
            isSuccess: false,
            isError: false,
            error: null,
            data: null,
          })),
        },
        getUserMap: {
          useQuery: vi.fn(() => ({
            data: null,
            isLoading: false,
            error: null,
          })),
        },
      },
      addItem: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(() => Promise.resolve({ id: 1, coordId: 'test' })),
          mutate: vi.fn(),
          isLoading: false,
        })),
      },
      updateItem: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(() => Promise.resolve({ id: 1 })),
          mutate: vi.fn(),
          isLoading: false,
        })),
      },
      removeItem: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(() => Promise.resolve()),
          mutate: vi.fn(),
          isLoading: false,
        })),
      },
      items: {
        create: {
          useMutation: () => ({
            mutateAsync: vi.fn(() => Promise.resolve({ id: 1, coordId: 'test' })),
            mutate: vi.fn(),
            isLoading: false,
          }),
        },
        update: {
          useMutation: () => ({
            mutateAsync: vi.fn(() => Promise.resolve({ id: 1 })),
            mutate: vi.fn(),
            isLoading: false,
          }),
        },
        delete: {
          useMutation: () => ({
            mutateAsync: vi.fn(() => Promise.resolve()),
            mutate: vi.fn(),
            isLoading: false,
          }),
        },
        move: {
          useMutation: () => ({
            mutateAsync: vi.fn(() => Promise.resolve({ success: true })),
            mutate: vi.fn(),
            isLoading: false,
          }),
        },
        moveMapItem: {
          useMutation: vi.fn(() => ({
            mutateAsync: vi.fn(() => Promise.resolve({ success: true })),
            mutate: vi.fn(),
            isLoading: false,
          })),
        },
      },
    },
  },
});

export const createLoggerMock = () => ({
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
});