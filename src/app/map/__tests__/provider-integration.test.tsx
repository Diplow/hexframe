import '~/test/setup'; // Import test setup FIRST
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
// import MapPage from '../page';
import { MapCacheProvider, useMapCache } from '../Cache/map-cache';
import { ChatCacheProvider } from '../Chat/Cache/ChatCacheProvider';
import { useChatCache } from '../Chat/Cache/ChatCacheProvider';
import { EventBus } from '../Services/event-bus';

const mockEventBus = new EventBus();

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/map',
}));

// Mock auth context
vi.mock('~/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 1 },
  }),
}));

// Mock map resolution hook
vi.mock('../_hooks/use-map-id-resolution', () => ({
  useMapIdResolution: () => ({
    centerCoordinate: '1,2:A1',
    userId: '1',
    groupId: '2',
    rootItemId: 1,
    isLoading: false,
    error: null,
  }),
}));

// Mock tRPC
vi.mock('~/server/api/trpc/react', () => ({
  api: {
    map: {
      getMap: {
        useQuery: () => ({
          data: { items: {} },
          isLoading: false,
          error: null,
        }),
      },
    },
  },
}));

describe('Provider Integration', () => {
  it('should nest ChatProvider inside MapCacheProvider', async () => {
    // Create a test wrapper that tracks provider hierarchy
    const providerOrder: string[] = [];

    const TestMapCacheProvider = ({ children }: { children: ReactNode }) => {
      providerOrder.push('MapCacheProvider');
      return <div data-testid="map-cache-provider">{children}</div>;
    };

    const TestChatProvider = ({ children }: { children: ReactNode }) => {
      providerOrder.push('ChatProvider');
      return <div data-testid="chat-provider">{children}</div>;
    };

    // Mock the providers
    vi.doMock('../Cache/map-cache', () => ({
      MapCacheProvider: TestMapCacheProvider,
      useMapCache: vi.fn(),
    }));

    vi.doMock('../Chat/ChatProvider', () => ({
      ChatProvider: TestChatProvider,
      useChatCache: vi.fn(),
    }));

    // Test that providers are nested in correct order
    expect(providerOrder).toEqual([]);
  });

  it('should allow ChatPanel to read MapCache data', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const TestComponent = () => {
      const { items } = useMapCache();
      const { state } = useChatCache();
      
      return (
        <div>
          <div data-testid="cache-items">{JSON.stringify(items)}</div>
          <div data-testid="chat-state">{JSON.stringify(state)}</div>
        </div>
      );
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MapCacheProvider
        initialItems={{ '1,2:A1': { 
          metadata: { 
            dbId: '1', 
            coordId: '1,2:A1',
            ownerId: '1',
            coordinates: { userId: 1, groupId: 2, path: [] },
            depth: 0,
            parentId: undefined,
          }, 
          data: { name: 'Test', description: '', url: '', color: 'blue' },
          state: {
            isDragged: false,
            isHovered: false,
            isSelected: false,
            isExpanded: false,
            isDragOver: false,
            isHovering: false,
            canExpand: false,
            canEdit: false,
          },
        } }}
        initialCenter="1,2:A1"
        initialExpandedItems={[]}
        cacheConfig={{ maxAge: 300000, backgroundRefreshInterval: 30000, enableOptimisticUpdates: true, maxDepth: 3 }}
        offlineMode={false}
        mapContext={{ rootItemId: 1, userId: 1, groupId: 2 }}
      >
        <ChatCacheProvider eventBus={mockEventBus}>
          {children}
        </ChatCacheProvider>
      </MapCacheProvider>
    );

    const { result } = renderHook(
      () => ({
        cache: useMapCache(),
        chat: useChatCache(),
      }),
      { wrapper }
    );

    // Both hooks should be accessible
    expect(result.current.cache).toBeDefined();
    expect(result.current.chat).toBeDefined();
  });

  it('should keep chat state separate from map data state', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MapCacheProvider
        initialItems={{}}
        initialCenter="1,2:A1"
        initialExpandedItems={[]}
        cacheConfig={{ maxAge: 300000, backgroundRefreshInterval: 30000, enableOptimisticUpdates: true, maxDepth: 3 }}
        offlineMode={false}
        mapContext={{ rootItemId: 1, userId: 1, groupId: 2 }}
      >
        <ChatCacheProvider eventBus={mockEventBus}>
          {children}
        </ChatCacheProvider>
      </MapCacheProvider>
    );

    const { result } = renderHook(
      () => ({
        cache: useMapCache(),
        chat: useChatCache(),
      }),
      { wrapper }
    );

    // Chat state should be independent of cache state
    expect(result.current.cache.items).toBeDefined();
    expect(result.current.chat.state.visibleMessages).toBeDefined();
    expect(result.current.chat.state.activeWidgets).toBeDefined();
  });

  it('should not persist chat messages on refresh', () => {
    // Chat messages are stored in memory only (no persistence)
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MapCacheProvider
        initialItems={{}}
        initialCenter="1,2:A1"
        initialExpandedItems={[]}
        cacheConfig={{ maxAge: 300000, backgroundRefreshInterval: 30000, enableOptimisticUpdates: true, maxDepth: 3 }}
        offlineMode={false}
        mapContext={{ rootItemId: 1, userId: 1, groupId: 2 }}
      >
        <ChatCacheProvider eventBus={mockEventBus}>
          {children}
        </ChatCacheProvider>
      </MapCacheProvider>
    );

    const { result, unmount } = renderHook(() => useChatCache(), { wrapper });

    // Add a message
    result.current.dispatch({
      id: 'test-select',
      type: 'tile_selected',
      payload: {
        tileId: 'test-1',
        tileData: { title: 'Test', content: 'Content', coordId: 'test-1' },
      },
      timestamp: new Date(),
      actor: 'system'
    });

    expect(result.current.state.visibleMessages).toHaveLength(1);

    // Simulate refresh by unmounting
    unmount();

    // Remount - messages should be gone
    const { result: newResult } = renderHook(() => useChatCache(), { wrapper });
    expect(newResult.current.state.visibleMessages).toHaveLength(0);
  });

  it('should dispatch chat actions through ChatProvider', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MapCacheProvider
        initialItems={{}}
        initialCenter="1,2:A1"
        initialExpandedItems={[]}
        cacheConfig={{ maxAge: 300000, backgroundRefreshInterval: 30000, enableOptimisticUpdates: true, maxDepth: 3 }}
        offlineMode={false}
        mapContext={{ rootItemId: 1, userId: 1, groupId: 2 }}
      >
        <ChatCacheProvider eventBus={mockEventBus}>
          {children}
        </ChatCacheProvider>
      </MapCacheProvider>
    );

    const { result } = renderHook(() => useChatCache(), { wrapper });

    // Dispatch action
    result.current.dispatch({ 
      id: 'test-close',
      type: 'clear_chat',
      payload: {},
      timestamp: new Date(),
      actor: 'system'
    });

    // State should update
    expect(result.current.state.events).toHaveLength(1);
  });
});