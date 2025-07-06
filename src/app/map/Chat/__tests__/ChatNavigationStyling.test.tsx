import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Messages } from '../Messages';
import { ChatCacheProvider } from '../Cache/ChatCacheProvider';
import { EventBus } from '../../Services/event-bus';
import type { Message } from '../Cache/_events/event.types';
import type { ReactNode } from 'react';

// Mock all dependencies
vi.mock('../Widgets/PreviewWidget', () => ({
  PreviewWidget: () => <div data-testid="preview-widget">Preview</div>,
}));

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

vi.mock('~/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

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

vi.mock('../_settings/useChatSettings', () => ({
  useChatSettings: () => ({}),
}));

const mockNavigateToItem = vi.fn();
const mockUseMapCache = vi.fn();

vi.mock('../../Cache/_hooks/use-map-cache', () => ({
  useMapCache: mockUseMapCache,
}));

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
    mockUseMapCache.mockReturnValue({
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

    expect(screen.getByText(/📍 Navigated to/)).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('System:')).toBeInTheDocument();
  });

  it('should apply muted styling to system messages', () => {
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

    const navigationMessage = screen.getByText(/📍 Navigated to/);
    expect(navigationMessage.closest('span')).toHaveClass('text-muted-foreground');
  });
});