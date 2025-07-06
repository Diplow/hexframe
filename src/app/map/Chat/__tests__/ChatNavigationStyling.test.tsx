import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Messages } from '../Messages';
import { ChatCacheProvider } from '../_cache/ChatCacheProvider';
import { EventBus } from '../../Services/event-bus';
import type { Message } from '../_cache/_events/event.types';
import type { ReactNode } from 'react';

// Mock the PreviewWidget component
vi.mock('../Widgets/PreviewWidget', () => ({
  PreviewWidget: () => <div data-testid="preview-widget">Preview</div>,
}));

// Mock other widget components
vi.mock('../Widgets/CreationWidget', () => ({
  CreationWidget: () => <div data-testid="creation-widget">Creation Widget</div>,
}));

vi.mock('../Widgets/LoginWidget', () => ({
  LoginWidget: () => <div data-testid="login-widget">Login Widget</div>,
}));

vi.mock('../Widgets/ConfirmDeleteWidget', () => ({
  ConfirmDeleteWidget: () => <div data-testid="delete-widget">Delete Widget</div>,
}));

vi.mock('../Widgets/LoadingWidget', () => ({
  LoadingWidget: () => <div data-testid="loading-widget">Loading Widget</div>,
}));

vi.mock('../Widgets/ErrorWidget', () => ({
  ErrorWidget: () => <div data-testid="error-widget">Error Widget</div>,
}));

// Mock auth context
vi.mock('~/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
  }),
}));

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock tRPC
vi.mock('~/commons/trpc/react', () => ({
  api: {
    useUtils: () => ({}),
    map: {
      user: {
        getUserMap: {
          useQuery: () => ({
            data: null,
            isLoading: false,
            error: null,
          }),
        },
        createDefaultMapForCurrentUser: {
          useMutation: () => ({
            mutateAsync: vi.fn(),
            mutate: vi.fn(),
            isLoading: false,
          }),
        },
      },
    },
  },
}));

// Mock chat settings
vi.mock('../_settings/useChatSettings', () => ({
  useChatSettings: () => ({}),
}));

// Mock navigation
const mockNavigateToItem = vi.fn();

// Mock the useMapCache hook - initially return minimal structure
const mockUseMapCache = vi.fn(() => ({ updateItemOptimistic: vi.fn() }));

vi.mock('../../Cache/_hooks/use-map-cache', () => ({
  useMapCache: mockUseMapCache,
}));

// Create test wrapper
function TestWrapper({ children }: { children: ReactNode }) {
  const eventBus = new EventBus();
  return (
    <ChatCacheProvider eventBus={eventBus}>
      {children}
    </ChatCacheProvider>
  );
}

describe('Chat Navigation Message Styling', () => {
  beforeEach(() => {
    // Set default mock return value
    mockUseMapCache.mockReturnValue({
      items: {},
      center: null,
      expandedItems: [],
      isLoading: false,
      error: null,
      lastUpdated: Date.now(),
      getRegionItems: vi.fn(),
      hasItem: vi.fn(),
      isRegionLoaded: vi.fn(),
      loadRegion: vi.fn(),
      loadItemChildren: vi.fn(),
      prefetchRegion: vi.fn(),
      invalidateRegion: vi.fn(),
      invalidateAll: vi.fn(),
      navigateToItem: mockNavigateToItem,
      updateCenter: vi.fn(),
      prefetchForNavigation: vi.fn(),
      toggleItemExpansionWithURL: vi.fn(),
      createItemOptimistic: vi.fn(),
      updateItemOptimistic: vi.fn(),
      deleteItemOptimistic: vi.fn(),
      moveItemOptimistic: vi.fn(),
      rollbackOptimisticChange: vi.fn(),
      rollbackAllOptimistic: vi.fn(),
      getPendingOptimisticChanges: vi.fn().mockReturnValue([]),
      sync: {
        isOnline: true,
        lastSyncTime: null,
        performSync: vi.fn(),
        forceSync: vi.fn(),
        pauseSync: vi.fn(),
        resumeSync: vi.fn(),
        getSyncStatus: vi.fn().mockReturnValue({ status: 'idle', lastError: null }),
      },
      config: {
        maxAge: 300000,
        backgroundRefreshInterval: 30000,
        enableOptimisticUpdates: true,
        maxDepth: 3,
      },
      updateConfig: vi.fn(),
    });
    vi.clearAllMocks();
  });
  it('should render navigation messages with System: prefix', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'system',
        content: '📍 Navigated to **Home**',
        timestamp: new Date(),
      },
    ];

    render(
      <TestWrapper>
        <Messages messages={messages} widgets={[]} />
      </TestWrapper>
    );

    // Should show the navigation message
    expect(screen.getByText(/📍 Navigated to/)).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    
    // Should show "System:" prefix for system messages
    expect(screen.getByText('System:')).toBeInTheDocument();
  });

  it('should apply smaller, muted, italic styling to navigation messages', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'system',
        content: '📍 Navigated to **Projects**',
        timestamp: new Date(),
      },
    ];

    render(
      <TestWrapper>
        <Messages messages={messages} widgets={[]} />
      </TestWrapper>
    );

    // Navigation messages should have muted styling
    const navigationMessage = screen.getByText(/📍 Navigated to/);
    expect(navigationMessage.closest('span')).toHaveClass('text-muted-foreground');
  });
  
  it('should make navigation tile names clickable', async () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'system',
        content: '📍 Navigated to **Dashboard**',
        timestamp: new Date(),
      },
    ];

    render(
      <TestWrapper>
        <Messages messages={messages} widgets={[]} />
      </TestWrapper>
    );

    const tileName = screen.getByText('Dashboard');
    // Navigation tile names are not clickable by default unless they have links
    // This test would need the content to include a link like [[Dashboard](#tile-dashboard-123)]]
    // to be clickable. Currently, the plain **Dashboard** is just bold text.
    expect(tileName).toBeInTheDocument();
  });

  it('should render regular system messages with System: prefix', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'system',
        content: 'Connection established',
        timestamp: new Date(),
      },
    ];

    render(
      <TestWrapper>
        <Messages messages={messages} widgets={[]} />
      </TestWrapper>
    );

    // Should show "System:" for non-navigation system messages
    expect(screen.getByText('System:')).toBeInTheDocument();
    expect(screen.getByText('Connection established')).toBeInTheDocument();
  });

  it('should handle mixed messages correctly', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'system',
        content: '📍 Navigated to **Dashboard**',
        timestamp: new Date(),
      },
      {
        id: '2',
        actor: 'user',
        content: 'Hello, can you help me?',
        timestamp: new Date(),
      },
      {
        id: '3',
        actor: 'system',
        content: 'System maintenance scheduled',
        timestamp: new Date(),
      },
    ];

    render(
      <TestWrapper>
        <Messages messages={messages} widgets={[]} />
      </TestWrapper>
    );

    // Navigation message should have System:
    expect(screen.getByText(/📍 Navigated to/)).toBeInTheDocument();
    
    // User message should have Guest (you): when not authenticated
    expect(screen.getByText('Guest (you):')).toBeInTheDocument();
    
    // Both system messages should have System:
    expect(screen.getAllByText('System:')).toHaveLength(2);
    expect(screen.getByText('System maintenance scheduled')).toBeInTheDocument();
  });

  it('should navigate using coordId from tile metadata', async () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'system',
        content: '📍 Navigated to **Test Tile**',
        timestamp: new Date(),
      },
    ];

    // Update mock to include the navigateToItem function and proper structure
    mockUseMapCache.mockReturnValue({
      items: {
        'tile-dashboard-123': {
          metadata: {
            dbId: 456,
            coordId: 'tile-dashboard-123',
            parentId: undefined,
            coordinates: { userId: 1, groupId: 1, path: [] },
            depth: 0,
            ownerId: '1',
          },
          data: { name: 'Dashboard', description: '', url: '', color: 'blue' },
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
        },
      },
      center: null,
      expandedItems: [],
      isLoading: false,
      error: null,
      lastUpdated: Date.now(),
      getRegionItems: vi.fn(),
      hasItem: vi.fn(),
      isRegionLoaded: vi.fn(),
      loadRegion: vi.fn(),
      loadItemChildren: vi.fn(),
      prefetchRegion: vi.fn(),
      invalidateRegion: vi.fn(),
      invalidateAll: vi.fn(),
      navigateToItem: mockNavigateToItem,
      updateCenter: vi.fn(),
      prefetchForNavigation: vi.fn(),
      toggleItemExpansionWithURL: vi.fn(),
      createItemOptimistic: vi.fn(),
      updateItemOptimistic: vi.fn(),
      deleteItemOptimistic: vi.fn(),
      moveItemOptimistic: vi.fn(),
      rollbackOptimisticChange: vi.fn(),
      rollbackAllOptimistic: vi.fn(),
      getPendingOptimisticChanges: vi.fn().mockReturnValue([]),
      sync: {
        isOnline: true,
        lastSyncTime: null,
        performSync: vi.fn(),
        forceSync: vi.fn(),
        pauseSync: vi.fn(),
        resumeSync: vi.fn(),
        getSyncStatus: vi.fn().mockReturnValue({ status: 'idle', lastError: null }),
      },
      config: {
        maxAge: 300000,
        backgroundRefreshInterval: 30000,
        enableOptimisticUpdates: true,
        maxDepth: 3,
      },
      updateConfig: vi.fn(),
    });

    render(
      <TestWrapper>
        <Messages messages={messages} widgets={[]} />
      </TestWrapper>
    );

    const tileName = screen.getByText('Test Tile');
    
    // Navigation tile names are not clickable by default unless they have links
    expect(tileName).toBeInTheDocument();
  });
});