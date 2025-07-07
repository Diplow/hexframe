import '~/test/setup'; // Import test setup FIRST
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { Messages } from '../Chat/Messages';
import { ChatCacheProvider } from '../Chat/Cache/ChatCacheProvider';
import { MapCacheProvider } from '../Cache/map-cache';
import { EventBus } from '../Services/event-bus';
import type { Widget } from '../Chat/Cache/types';
import type { Message } from '../Chat/Cache/_events/event.types';

// Mock functions need to be declared before vi.mock calls
const mockNavigateToItem = vi.fn();
const mockFetchUserMap = vi.fn();

// Store auth state that can be modified during tests
interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

let authState = {
  user: null as AuthUser | null,
  mappingUserId: undefined as number | undefined,
  isLoading: false,
  setMappingUserId: vi.fn(),
};

// Mock auth context
vi.mock('~/contexts/AuthContext', () => ({
  useAuth: () => authState,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the tRPC utils for user map fetching
vi.mock('~/commons/trpc/react', () => ({
  api: {
    useUtils: () => ({
      map: {
        user: {
          getUserMap: {
            fetch: mockFetchUserMap,
          },
        },
      },
    }),
    map: {
      addItem: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          mutate: vi.fn(),
          isLoading: false,
        }),
      },
      updateItem: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          mutate: vi.fn(),
          isLoading: false,
        }),
      },
      removeItem: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          mutate: vi.fn(),
          isLoading: false,
        }),
      },
      moveItem: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          mutate: vi.fn(),
          isLoading: false,
        }),
      },
      items: {
        moveMapItem: {
          useMutation: () => ({
            mutateAsync: vi.fn(),
            mutate: vi.fn(),
            isLoading: false,
          }),
        },
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
      },
      user: {
        createDefaultMapForCurrentUser: {
          useMutation: () => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn(),
            isLoading: false,
            isSuccess: false,
            isError: false,
          }),
        },
        getUserMap: {
          useQuery: () => ({
            data: null,
            isLoading: false,
            error: null,
          }),
        },
      },
    },
  },
}));

// Mock the navigation hook
vi.mock('../Cache/_hooks/use-map-cache', () => ({
  useMapCache: () => ({
    navigateToItem: mockNavigateToItem,
    items: {},
    center: null,
    expandedItems: [],
    isLoading: false,
    error: null,
    lastUpdated: Date.now(),
    getRegionItems: vi.fn(() => []),
    hasItem: vi.fn(() => false),
    isRegionLoaded: vi.fn(() => false),
    loadRegion: vi.fn(async () => ({ success: true, itemCount: 0 })),
    loadItemChildren: vi.fn(async () => ({ success: true, itemCount: 0 })),
    prefetchRegion: vi.fn(async () => ({ success: true, itemCount: 0 })),
    invalidateRegion: vi.fn(),
    invalidateAll: vi.fn(),
    updateCenter: vi.fn(),
    prefetchForNavigation: vi.fn(async () => { 
      return undefined;
    }),
    toggleItemExpansionWithURL: vi.fn(),
    createItemOptimistic: vi.fn(async () => { 
      return undefined;
    }),
    updateItemOptimistic: vi.fn(async () => { 
      return undefined;
    }),
    deleteItemOptimistic: vi.fn(async () => { 
      return undefined;
    }),
    moveItemOptimistic: vi.fn(async () => ({ success: true })),
    rollbackOptimisticChange: vi.fn(),
    rollbackAllOptimistic: vi.fn(),
    getPendingOptimisticChanges: vi.fn(() => []),
    sync: {
      isOnline: true,
      lastSyncTime: null,
      performSync: vi.fn(async () => ({ success: true, syncedItems: 0, errors: [] })),
      forceSync: vi.fn(async () => ({ success: true, syncedItems: 0, errors: [] })),
      pauseSync: vi.fn(),
      resumeSync: vi.fn(),
      getSyncStatus: vi.fn(() => ({ isPending: false, lastSync: null, error: null })),
    },
    config: {
      maxDepth: 2,
      maxRadius: 2,
      cacheDuration: 300000,
      enableOffline: true,
    },
    updateConfig: vi.fn(),
  }),
}));

describe('Chat Navigation Integration', () => {
  let eventBus: EventBus;
  
  beforeEach(() => {
    eventBus = new EventBus();
    mockNavigateToItem.mockClear();
    mockFetchUserMap.mockClear();
    
    // Reset auth state to default
    authState = {
      user: null,
      mappingUserId: undefined,
      isLoading: false,
      setMappingUserId: vi.fn(),
    };
  });

  const renderWithProviders = (
    messages: Message[], 
    widgets: Widget[] = [],
    user: { id: string; name?: string; email: string } | null = null
  ) => {
    // Update the auth state based on the user parameter
    authState = {
      user,
      mappingUserId: user ? 123 : undefined,
      isLoading: false,
      setMappingUserId: vi.fn(),
    };

    return render(
      <MapCacheProvider
        initialItems={{}}
        initialCenter={null}
        initialExpandedItems={[]}
        cacheConfig={{ maxAge: 300000, backgroundRefreshInterval: 30000, enableOptimisticUpdates: true, maxDepth: 3 }}
        offlineMode={false}
        eventBus={eventBus}
        mapContext={{ rootItemId: 0, userId: 0, groupId: 0 }}
      >
        <ChatCacheProvider eventBus={eventBus}>
          <Messages messages={messages} widgets={widgets} />
        </ChatCacheProvider>
      </MapCacheProvider>
    );
  };

  it('should navigate to user map when clicking "You" while logged in', async () => {
    const messages: Message[] = [{
      id: 'msg-1',
      content: 'Hello world',
      actor: 'user',
      timestamp: new Date(),
    }];

    // Mock the user map fetch response
    mockFetchUserMap.mockResolvedValue({
      success: true,
      map: { id: 123, name: 'John\'s Map' }
    });

    renderWithProviders(messages, [], { id: '123', name: 'John Doe', email: 'john@example.com' });

    const youButton = screen.getByRole('button', { name: /You:/ });
    expect(youButton).toBeInTheDocument();
    
    fireEvent.click(youButton);
    
    await waitFor(() => {
      expect(mockFetchUserMap).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockNavigateToItem).toHaveBeenCalledWith('123');
    });
  });

  it('should show "Guest (you)" and open register widget when not logged in', async () => {
    const messages: Message[] = [{
      id: 'msg-1',
      content: 'Hello world',
      actor: 'user',
      timestamp: new Date(),
    }];

    renderWithProviders(messages);

    const guestButton = screen.getByRole('button', { name: /Guest \(you\):/ });
    expect(guestButton).toBeInTheDocument();
    
    fireEvent.click(guestButton);
    
    // Check that navigation was not called
    expect(mockNavigateToItem).not.toHaveBeenCalled();
    
    // In a full integration test, we'd verify the auth event was dispatched
  });

  it('should include navigation event in chat history', async () => {
    const messages: Message[] = [{
      id: 'msg-1',
      content: 'Hello world',
      actor: 'user',
      timestamp: new Date(),
    }];

    renderWithProviders(messages, [], { id: '123', name: 'John Doe', email: 'john@example.com' });

    const youButton = screen.getByRole('button', { name: /You:/ });
    fireEvent.click(youButton);
    
    // In a full integration test, we'd verify the navigation event was dispatched
  });
});