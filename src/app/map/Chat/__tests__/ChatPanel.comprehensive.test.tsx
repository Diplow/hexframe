import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPanel } from '../ChatPanel';
import { TestProviders } from '~/test-utils/providers';
import { createMockEventBus } from '~/test-utils/event-bus';
import { chatSettings } from '../_settings/chat-settings';
import type { AppEvent } from '../../types/events';

// Mock dependencies
vi.mock('../_settings/chat-settings', () => ({
  chatSettings: {
    subscribe: vi.fn((callback: (settings: unknown) => void) => {
      // Call the callback immediately with the current settings
      callback({
        messages: { 
          debug: false,
        tile: {
          edit: true,
          create: true,
          delete: true,
          move: true,
          swap: true,
          },
        },
      });
      // Return unsubscribe function
      return () => undefined;
    }),
    getSettings: vi.fn(() => ({
      messages: { 
        debug: false,
        tile: {
          edit: true,
          create: true,
          delete: true,
          move: true,
          swap: true,
        },
      },
    })),
    toggleTileEdit: vi.fn(() => true),
    toggleTileCreate: vi.fn(() => true),
    toggleTileDelete: vi.fn(() => true),
    toggleTileMove: vi.fn(() => true),
    toggleTileSwap: vi.fn(() => true),
    toggleDebug: vi.fn(() => true),
    resetToDefaults: vi.fn(),
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
  },
}));

// Mock the ai actions
vi.mock('../../Actions/ai-actions', () => ({
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
  map: {
    user: {
      createDefaultMapForCurrentUser: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn().mockResolvedValue({ success: false }),
        })),
      },
    },
  },
}));

vi.mock('~/lib/debug/debug-logger', () => ({
  loggers: {
    render: {
      chat: vi.fn(),
    },
  },
  debugLogger: {
    formatLogs: vi.fn(() => ['[2024-01-01 10:00:00] Test log message']),
    getFullLogs: vi.fn(() => []),
    clearBuffer: vi.fn(),
    getOptions: vi.fn(() => ({ enableConsole: false })),
    setOptions: vi.fn(),
  },
}));

vi.mock('../../Cache/_hooks/use-map-cache', () => ({
  useMapCache: () => ({
    items: {},
    navigateToItem: vi.fn(),
    updateItemOptimistic: vi.fn(),
    createItemOptimistic: vi.fn(),
    deleteItemOptimistic: vi.fn(),
    moveItemOptimistic: vi.fn(),
    rollbackOptimisticChange: vi.fn(),
    rollbackAllOptimistic: vi.fn(),
    getPendingOptimisticChanges: vi.fn(() => []),
    center: null,
    expandedItems: [],
    isLoading: false,
    error: null,
    lastUpdated: Date.now(),
    getRegionItems: vi.fn(() => []),
    hasItem: vi.fn(() => false),
    isRegionLoaded: vi.fn(() => false),
    loadRegion: vi.fn().mockResolvedValue({ success: true, items: [] }),
    loadItemChildren: vi.fn().mockResolvedValue({ success: true, items: [] }),
    prefetchRegion: vi.fn().mockResolvedValue({ success: true, items: [] }),
    invalidateRegion: vi.fn(),
    invalidateAll: vi.fn(),
    updateCenter: vi.fn(),
    prefetchForNavigation: vi.fn(),
    toggleItemExpansionWithURL: vi.fn(),
    sync: {
      isOnline: true,
      lastSyncTime: null,
      performSync: vi.fn().mockResolvedValue({ success: true }),
      forceSync: vi.fn().mockResolvedValue({ success: true }),
      pauseSync: vi.fn(),
      resumeSync: vi.fn(),
      getSyncStatus: vi.fn(() => ({
        isOnline: true,
        isSyncing: false,
        lastSyncAt: null,
        nextSyncAt: null,
        syncCount: 0,
        errorCount: 0,
        lastError: null,
      })),
    },
    config: {
      maxAge: 300000,
      backgroundRefreshInterval: 30000,
      enableOptimisticUpdates: true,
      maxDepth: 3,
    },
    updateConfig: vi.fn(),
  }),
}));

// Mock router and pathname
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
  usePathname: vi.fn(() => '/map'),
}));

// Mock useMapCache
vi.mock('../../Cache/_hooks/use-map-cache', () => ({
  useMapCache: vi.fn(() => ({
    items: {},
    navigateToItem: vi.fn(),
    updateItemOptimistic: vi.fn().mockResolvedValue({ success: true }),
    createItemOptimistic: vi.fn().mockResolvedValue({ success: true }),
    deleteItemOptimistic: vi.fn().mockResolvedValue({ success: true }),
    moveItemOptimistic: vi.fn().mockResolvedValue({ success: true }),
    rollbackOptimisticChange: vi.fn(),
    revalidateCache: vi.fn(),
    setSelectedItemId: vi.fn(),
    currentItem: null,
    hasItems: false,
    isInitialized: true,
  })),
}));

// Remove unused interfaces since we're using real components

// Mock the MessageActorRenderer to simplify widget rendering in tests
interface MockMessage {
  type: string;
  content: unknown;
}

interface MockWidget {
  type: string;
  data?: {
    tileData?: {
      title?: string;
      description?: string;
    };
    openInEditMode?: boolean;
    tileName?: string;
    reason?: string;
    error?: string;
  };
}

vi.mock('../Messages/MessageActorRenderer', () => ({
  MessageActorRenderer: ({ message }: { message: MockMessage }) => {
    if (message.type === 'widget') {
      const widget = message.content as MockWidget;
      return (
        <div data-testid={`widget-${widget.type}`}>
          {widget.type === 'preview' && (
            <>
              <div>{widget.data?.tileData?.title}</div>
              <div>{widget.data?.tileData?.description}</div>
              {widget.data?.openInEditMode && (
                <>
                  <input type="text" defaultValue={widget.data?.tileData?.title} />
                  <button>Save</button>
                </>
              )}
            </>
          )}
          {widget.type === 'delete' && (
            <>
              <span>Delete &quot;{widget.data?.tileName}&quot;</span>
              <button>Confirm</button>
              <button>Cancel</button>
            </>
          )}
          {widget.type === 'auth' && (
            <>
              <span>{widget.data?.reason}</span>
              <button>Log In</button>
            </>
          )}
          {widget.type === 'error' && <span>{widget.data?.error}</span>}
          <button>Close</button>
        </div>
      );
    }
    return <div role="article">{String(message.content)}</div>;
  },
}));

// Mock ScrollContainer to avoid ref issues in tests
vi.mock('../Messages/ScrollContainer', () => ({
  ScrollContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chat-messages">{children}</div>
  ),
}));

// Mock ScrollAnimator to avoid async issues
vi.mock('../Messages/ScrollAnimator', () => ({
  ScrollAnimator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Chat Component Comprehensive Test Suite', () => {
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

  describe('1. Basic Component Rendering and Structure', () => {
    it('should render all core components', () => {
      renderWithProviders(<ChatPanel />);
      
      // Header components
      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByText('Hex')).toBeInTheDocument();
      expect(screen.getByText('Frame')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
      
      // Message area
      expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
      
      // Input area
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
      expect(screen.getByTestId('send-button')).toBeInTheDocument();
    });

    it('should display welcome message on first load', async () => {
      renderWithProviders(<ChatPanel />);
      
      // The welcome message is shown through the Messages component
      await waitFor(() => {
        const articles = screen.getAllByRole('article');
        expect(articles).toHaveLength(1);
        expect(articles[0]).toHaveTextContent(/Welcome to.*HexFrame/i);
      });
    });
  });

  describe('2. Message Handling', () => {
    it('should send user messages when typing and clicking send', async () => {
      renderWithProviders(<ChatPanel />);
      
      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, 'Hello world');
      await user.click(screen.getByTestId('send-button'));
      
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should send messages with Enter key', async () => {
      renderWithProviders(<ChatPanel />);
      
      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, 'Test message{Enter}');
      
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should not send empty messages', async () => {
      renderWithProviders(<ChatPanel />);
      
      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toBeDisabled();
      
      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, '   ');
      
      expect(sendButton).toBeDisabled();
    });

    it.skip('should preserve message history with arrow keys', async () => {
      // This test is skipped because message history navigation is complex
      // and would require mocking localStorage and the exact history behavior
    });
  });

  describe('3. Command System', () => {
    it('should show command autocomplete when typing /', async () => {
      renderWithProviders(<ChatPanel />);
      
      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, '/');
      
      await waitFor(() => {
        expect(screen.getByTestId('command-autocomplete')).toBeInTheDocument();
      });
    });

    it('should filter command suggestions as user types', async () => {
      renderWithProviders(<ChatPanel />);
      
      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, '/deb');
      
      await waitFor(() => {
        const suggestions = screen.getAllByTestId('command-suggestion');
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions[0]).toHaveTextContent('/debug');
      });
    });


    it.skip('should handle /clear command', async () => {
      renderWithProviders(<ChatPanel />);
      
      // Add some messages first
      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, 'Test message{Enter}');
      
      // Clear chat
      await user.type(input, '/clear{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText(/message timeline cleared/i)).toBeInTheDocument();
      });
    });

    it.skip('should handle settings commands', async () => {
      renderWithProviders(<ChatPanel />);
      
      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, '/settings/messages/toggle/tile/edit{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText(/tile edit messages are now enabled/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. Event Bus Integration', () => {
    it('should react to map.navigation events', async () => {
      renderWithProviders(<ChatPanel />);
      
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
      });
      
      await act(async () => {
        mockEventBus.emit({
          type: 'map.navigation',
          source: 'map_cache',
          payload: {
            fromCenterId: 'old-center',
            toCenterId: 'new-center',
            toCenterName: 'New Tile',
          },
          timestamp: new Date(),
        });
      });
      
      await waitFor(() => {
        const messages = screen.getAllByRole('article');
        const navMessage = messages.find(msg => 
          msg.textContent?.toLowerCase().includes('navigated to')
        );
        expect(navMessage).toBeDefined();
      });
    });

    it.skip('should show preview widget on map.tile_selected event', async () => {
      renderWithProviders(<ChatPanel />);
      
      await act(async () => {
        mockEventBus.emit({
          type: 'map.tile_selected',
          source: 'map_cache',
          payload: {
            tileId: 'coord-123',
            tileData: {
              id: '123',
              title: 'Test Tile',
              description: 'Test description',
              content: 'Test content',
              coordId: 'coord-123',
            },
            openInEditMode: false,
          },
          timestamp: new Date(),
        });
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('widget-preview')).toBeInTheDocument();
        expect(screen.getByText('Test Tile')).toBeInTheDocument();
        expect(screen.getByText('Test description')).toBeInTheDocument();
      });
    });

    it('should show edit widget on map.tile_selected event with openInEditMode', async () => {
      renderWithProviders(<ChatPanel />);
      
      mockEventBus.emit({
        type: 'map.tile_selected',
        source: 'map_cache',
        payload: {
          tileId: 'coord-123',
          tileData: {
            id: '123',
            title: 'Edit Me',
            description: 'Content to edit',
            content: 'Content to edit',
            coordId: 'coord-123',
          },
          openInEditMode: true,
        },
        timestamp: new Date(),
      });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Edit Me')).toBeInTheDocument();
      });
    });

    it.skip('should show delete confirmation on map.delete_requested event', async () => {
      renderWithProviders(<ChatPanel />);
      
      await act(async () => {
        mockEventBus.emit({
          type: 'map.delete_requested',
          source: 'canvas',
          payload: {
            tileId: 'coord-123',
            tileName: 'Tile to Delete',
          },
          timestamp: new Date(),
        });
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('widget-delete')).toBeInTheDocument();
        expect(screen.getByText(/delete "tile to delete"/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    it.skip('should handle operation completed events', async () => {
      renderWithProviders(<ChatPanel />);
      
      const events: AppEvent[] = [
        {
          type: 'map.tile_created',
          source: 'map_cache',
          payload: { tileId: '1', tileName: 'Created Tile', coordId: 'coord-1' },
          timestamp: new Date(),
        },
        {
          type: 'map.tile_updated',
          source: 'map_cache',
          payload: { tileId: '2', tileName: 'Updated Tile', coordId: 'coord-2', changes: {} },
          timestamp: new Date(),
        },
        {
          type: 'map.tile_deleted',
          source: 'map_cache',
          payload: { tileId: '3', tileName: 'Deleted Tile', coordId: 'coord-3' },
          timestamp: new Date(),
        },
        {
          type: 'map.tiles_swapped',
          source: 'map_cache',
          payload: { tile1Id: '4', tile1Name: 'Tile A', tile2Id: '5', tile2Name: 'Tile B' },
          timestamp: new Date(),
        },
      ];
      
      for (const event of events) {
        mockEventBus.emit(event);
      }
      
      await waitFor(() => {
        expect(screen.getByText(/created "created tile"/i)).toBeInTheDocument();
        expect(screen.getByText(/updated "updated tile"/i)).toBeInTheDocument();
        expect(screen.getByText(/deleted "deleted tile"/i)).toBeInTheDocument();
        expect(screen.getByText(/swapped "tile a" with "tile b"/i)).toBeInTheDocument();
      });
    });

    it('should show auth widget on auth.required event', async () => {
      renderWithProviders(<ChatPanel />);
      
      mockEventBus.emit({
        type: 'auth.required',
        source: 'map_cache',
        payload: {
          reason: 'Please log in to edit tiles',
          requiredFor: 'tile_edit',
        },
        timestamp: new Date(),
      });
      
      await waitFor(() => {
        expect(screen.getByText(/please log in to edit tiles/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
      });
    });

    it('should handle error events', async () => {
      renderWithProviders(<ChatPanel />);
      
      mockEventBus.emit({
        type: 'error.occurred',
        source: 'map_cache',
        payload: {
          error: 'Failed to save tile',
          context: { tileId: '123' },
          retryable: true,
        },
        timestamp: new Date(),
      });
      
      await waitFor(() => {
        expect(screen.getByText(/failed to save tile/i)).toBeInTheDocument();
      });
    });

    it.skip('should clear chat on auth.logout event', async () => {
      renderWithProviders(<ChatPanel />);
      
      // Add some content first
      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, 'Test message{Enter}');
      
      // Emit logout event
      mockEventBus.emit({
        type: 'auth.logout',
        source: 'auth',
        payload: {},
        timestamp: new Date(),
      });
      
      await waitFor(() => {
        // Should only show welcome message after clear
        const messages = screen.getAllByRole('article');
        expect(messages).toHaveLength(1);
        expect(screen.getByText(/welcome to hexframe/i)).toBeInTheDocument();
      });
    });
  });

  describe('5. Widget System', () => {
    it.skip('should allow closing widgets', async () => {
      renderWithProviders(<ChatPanel />);
      
      // Show a preview widget
      mockEventBus.emit({
        type: 'map.tile_selected',
        source: 'map_cache',
        payload: {
          tileId: 'coord-123',
          tileData: {
            id: '123',
            title: 'Closeable Widget',
            description: 'Test',
            content: 'Test',
            coordId: 'coord-123',
          },
          openInEditMode: false,
        },
        timestamp: new Date(),
      });
      
      await waitFor(() => {
        expect(screen.getByText('Closeable Widget')).toBeInTheDocument();
      });
      
      // Close the widget
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Closeable Widget')).not.toBeInTheDocument();
      });
    });

    it.skip('should handle widget actions (edit, save, delete)', async () => {
      const { useMapCache } = await import('../../Cache/_hooks/use-map-cache');
      const mockUpdateTile = vi.fn().mockResolvedValue({ success: true });
      vi.mocked(useMapCache).mockReturnValue({
        items: {},
        navigateToItem: vi.fn(),
        updateItemOptimistic: mockUpdateTile,
        createItemOptimistic: vi.fn(),
        deleteItemOptimistic: vi.fn(),
        moveItemOptimistic: vi.fn(),
        rollbackOptimisticChange: vi.fn(),
        rollbackAllOptimistic: vi.fn(),
        getPendingOptimisticChanges: vi.fn(() => []),
        center: null,
        expandedItems: [],
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
        getRegionItems: vi.fn(() => []),
        hasItem: vi.fn(() => false),
        isRegionLoaded: vi.fn(() => false),
        loadRegion: vi.fn().mockResolvedValue({ success: true, items: [] }),
        loadItemChildren: vi.fn().mockResolvedValue({ success: true, items: [] }),
        prefetchRegion: vi.fn().mockResolvedValue({ success: true, items: [] }),
        invalidateRegion: vi.fn(),
        invalidateAll: vi.fn(),
        updateCenter: vi.fn(),
        prefetchForNavigation: vi.fn(),
        toggleItemExpansionWithURL: vi.fn(),
        sync: {
          isOnline: true,
          lastSyncTime: null,
          performSync: vi.fn().mockResolvedValue({ success: true }),
          forceSync: vi.fn().mockResolvedValue({ success: true }),
          pauseSync: vi.fn(),
          resumeSync: vi.fn(),
          getSyncStatus: vi.fn(() => ({
        isOnline: true,
        isSyncing: false,
        lastSyncAt: null,
        nextSyncAt: null,
        syncCount: 0,
        errorCount: 0,
        lastError: null,
      })),
        },
        config: {
          maxAge: 300000,
          backgroundRefreshInterval: 30000,
          enableOptimisticUpdates: true,
          maxDepth: 3,
        },
        updateConfig: vi.fn(),
      });
      
      renderWithProviders(<ChatPanel />);
      
      // Show edit widget
      mockEventBus.emit({
        type: 'map.tile_selected',
        source: 'map_cache',
        payload: {
          tileId: 'coord-123',
          tileData: {
            id: '123',
            title: 'Original Title',
            description: 'Original content',
            content: 'Original content',
            coordId: 'coord-123',
          },
          openInEditMode: true,
        },
        timestamp: new Date(),
      });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument();
      });
      
      // Edit the title
      const titleInput = screen.getByDisplayValue('Original Title');
      await user.clear(titleInput);
      await user.type(titleInput, 'New Title');
      
      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateTile).toHaveBeenCalledWith(
          'coord-123',
          expect.objectContaining({
            title: 'New Title',
          })
        );
      });
    });

    it.skip('should show loading state during async operations', async () => {
      renderWithProviders(<ChatPanel />);
      
      // Trigger an async operation
      mockEventBus.emit({
        type: 'map.tile_selected',
        source: 'map_cache',
        payload: {
          tileId: 'coord-123',
          tileData: {
            id: '123',
            title: 'Loading Test',
            description: 'Test',
            content: 'Test',
            coordId: 'coord-123',
          },
          openInEditMode: true,
        },
        timestamp: new Date(),
      });
      
      // Widget should show while loading content
      await waitFor(() => {
        expect(screen.getByText('Loading Test')).toBeInTheDocument();
      });
    });
  });

  describe('6. Authentication Integration', () => {
    it('should show login button when not authenticated', () => {
      renderWithProviders(<ChatPanel />);
      
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    it('should show logout button when authenticated', async () => {
      const { useAuth } = await import('~/contexts/AuthContext');
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        mappingUserId: 123,
        isLoading: false,
        setMappingUserId: vi.fn(),
      });
      
      renderWithProviders(<ChatPanel />);
      
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    it('should handle logout action', async () => {
      const { authClient } = await import('~/lib/auth/auth-client');
      const { useAuth } = await import('~/contexts/AuthContext');
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        mappingUserId: 123,
        isLoading: false,
        setMappingUserId: vi.fn(),
      });
      
      renderWithProviders(<ChatPanel />);
      
      const logoutButton = screen.getByRole('button', { name: 'Logout' });
      await user.click(logoutButton);
      
      expect(authClient.signOut).toHaveBeenCalled();
      expect(mockEventBus).toHaveEmittedEvent('auth.logout');
    });

    it.skip('should show login message via /login command', async () => {
      renderWithProviders(<ChatPanel />);
      
      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, '/login{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText(/please log in to access this feature/i)).toBeInTheDocument();
      });
    });
  });

  describe('7. Debug Mode', () => {
    it('should show all event bus events when debug mode is enabled', async () => {
      vi.mocked(chatSettings).getSettings.mockReturnValue({
        messages: {
          debug: true,
          tile: {
            edit: true,
            create: true,
            delete: true,
            move: true,
            swap: true,
          },
        },
      });
      
      renderWithProviders(<ChatPanel />);
      
      // Emit any event
      mockEventBus.emit({
        type: 'test.event',
        source: 'test',
        payload: { data: 'test' },
        timestamp: new Date(),
      });
      
      await waitFor(() => {
        expect(screen.getByText(/\[debug\] eventbus: \*\*test\.event\*\*/i)).toBeInTheDocument();
      });
    });

    it.skip('should toggle debug mode via command', async () => {
      renderWithProviders(<ChatPanel />);
      
      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, '/settings/messages/toggle/debug{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText(/debug messages are now enabled/i)).toBeInTheDocument();
      });
    });
  });

  describe('8. Message Filtering', () => {
    it('should respect message visibility settings', async () => {
      // Disable tile create messages
      vi.mocked(chatSettings).getSettings.mockReturnValue({
        messages: {
          debug: false,
          tile: {
            edit: true,
            create: false, // Disabled
            delete: true,
            move: true,
            swap: true,
          },
        },
      });
      
      renderWithProviders(<ChatPanel />);
      
      // Emit a tile created event
      mockEventBus.emit({
        type: 'map.tile_created',
        source: 'map_cache',
        payload: { tileId: '1', tileName: 'Hidden Tile', coordId: 'coord-1' },
        timestamp: new Date(),
      });
      
      // Message should not appear
      await waitFor(() => {
        expect(screen.queryByText(/created "hidden tile"/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('9. Keyboard Navigation', () => {
    it.skip('should navigate command suggestions with arrow keys', async () => {
      renderWithProviders(<ChatPanel />);
      
      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, '/debug');
      
      await waitFor(() => {
        const suggestions = screen.getAllByTestId('command-suggestion');
        expect(suggestions.length).toBeGreaterThan(1);
      });
      
      // Navigate down
      await user.keyboard('{ArrowDown}');
      
      const suggestions = screen.getAllByTestId('command-suggestion');
      expect(suggestions[1]).toHaveAttribute('data-selected', 'true');
      
      // Select with Enter
      await user.keyboard('{Enter}');
      
      // Should have selected the command
      // Note: Since we're using a mock Input component, we can't test the actual value
    });

    it('should close autocomplete with Escape', async () => {
      renderWithProviders(<ChatPanel />);
      
      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, '/');
      
      await waitFor(() => {
        expect(screen.getByTestId('command-autocomplete')).toBeInTheDocument();
      });
      
      await user.keyboard('{Escape}');
      
      expect(screen.queryByTestId('command-autocomplete')).not.toBeInTheDocument();
    });
  });

  describe('10. Complex Interaction Scenarios', () => {
    it.skip('should handle rapid event sequences', async () => {
      renderWithProviders(<ChatPanel />);
      
      // Emit multiple events rapidly
      for (let i = 0; i < 5; i++) {
        mockEventBus.emit({
          type: 'map.navigation',
          source: 'map_cache',
          payload: {
            fromCenterId: `tile-${i}`,
            toCenterId: `tile-${i + 1}`,
            toCenterName: `Tile ${i + 1}`,
          },
          timestamp: new Date(),
        });
      }
      
      // All navigation messages should appear
      await waitFor(() => {
        expect(screen.getAllByText(/navigated to "tile/i)).toHaveLength(5);
      });
    });

    it.skip('should handle widget interactions while receiving events', async () => {
      renderWithProviders(<ChatPanel />);
      
      // Show an edit widget
      mockEventBus.emit({
        type: 'map.tile_selected',
        source: 'map_cache',
        payload: {
          tileId: 'coord-123',
          tileData: {
            id: '123',
            title: 'Edit During Events',
            description: 'Content',
            content: 'Content',
            coordId: 'coord-123',
          },
          openInEditMode: true,
        },
        timestamp: new Date(),
      });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Edit During Events')).toBeInTheDocument();
      });
      
      // Start editing
      const titleInput = screen.getByDisplayValue('Edit During Events');
      await user.clear(titleInput);
      await user.type(titleInput, 'New Title');
      
      // Receive events while editing
      mockEventBus.emit({
        type: 'map.navigation',
        source: 'map_cache',
        payload: {
          fromCenterId: 'old',
          toCenterId: 'new',
          toCenterName: 'Background Navigation',
        },
        timestamp: new Date(),
      });
      
      // Widget should remain functional
      expect(titleInput).toHaveValue('New Title');
      
      // Navigation message should still appear
      await waitFor(() => {
        expect(screen.getByText(/navigated to "background navigation"/i)).toBeInTheDocument();
      });
    });

    it.skip('should maintain state consistency across chat operations', async () => {
      renderWithProviders(<ChatPanel />);
      
      // Send a message
      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, 'Test message{Enter}');
      
      // Execute a command
      await user.type(input, '/settings/messages/status{Enter}');
      
      // Receive an event
      mockEventBus.emit({
        type: 'map.tile_created',
        source: 'map_cache',
        payload: { tileId: '1', tileName: 'New Tile', coordId: 'coord-1' },
        timestamp: new Date(),
      });
      
      // All items should be in the timeline
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
        expect(screen.getByText(/current message settings/i)).toBeInTheDocument();
        expect(screen.getByText(/created "new tile"/i)).toBeInTheDocument();
      });
    });
  });
});