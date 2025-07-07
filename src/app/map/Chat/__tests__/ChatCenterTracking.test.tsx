import '~/test/setup'; // Import test setup FIRST
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ChatProvider } from '../ChatProvider';
import { ChatPanel } from '../ChatPanel';
import { EventBus } from '../../Services/event-bus';
import type { ReactNode } from 'react';

// Mock the useMapCache hook since ChatPanel uses it for tile selection
vi.mock('../../Cache/_hooks/use-map-cache', () => ({
  useMapCache: vi.fn(() => ({
    center: null,
    items: {},
    navigateToItem: vi.fn(),
  })),
}));

// Mock the auth context
vi.mock('~/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
  }),
}));

// Mock the theme context
vi.mock('~/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/map',
}));

// Mock auth client to prevent actual authentication attempts
vi.mock('~/lib/auth/auth-client', () => ({
  authClient: {
    signOut: vi.fn(),
  },
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
          fetch: () => Promise.resolve({
            success: false,
            map: null,
          }),
        },
        createDefaultMapForCurrentUser: {
          useMutation: () => ({
            mutateAsync: vi.fn().mockResolvedValue({
              success: true,
              mapId: 'new-map-id',
            }),
          }),
        },
      },
    },
  },
}));

let testEventBus: EventBus;

function TestWrapper({ children }: { children: ReactNode }) {
  return <ChatProvider eventBus={testEventBus}>{children}</ChatProvider>;
}

describe('Chat Center Tracking via Event Bus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testEventBus = new EventBus();
  });

  it('should show welcome message without navigation on initial mount', () => {
    const TestWrapperWithWelcome = ({ children }: { children: ReactNode }) => {
      return (
        <ChatProvider 
          eventBus={testEventBus}
          initialEvents={[
            {
              type: 'message',
              payload: {
                content: 'Welcome to **Hexframe**! Navigate the map by clicking on tiles, or use the chat to ask questions.',
                actor: 'system',
              },
              id: 'welcome-message',
              timestamp: new Date(),
              actor: 'system',
            }
          ]}
        >
          {children}
        </ChatProvider>
      );
    };

    render(
      <TestWrapperWithWelcome>
        <ChatPanel />
      </TestWrapperWithWelcome>
    );

    // Should show welcome message
    expect(screen.getByText(/Welcome to/)).toBeInTheDocument();
    expect(screen.getByText(/Hexframe/)).toBeInTheDocument();
    // Should NOT show navigation message on initial mount
    expect(screen.queryByText(/Navigated to/)).not.toBeInTheDocument();
  });

  it('should show navigation message when navigation event is emitted', () => {
    render(
      <TestWrapper>
        <ChatPanel />
      </TestWrapper>
    );

    // Emit a navigation event through the event bus (simulating MapCache navigation)
    act(() => {
      testEventBus.emit({
        type: 'map.navigation',
        source: 'map_cache',
        payload: {
          fromCenterId: 'tile-1',
          toCenterId: 'tile-2',
          toCenterName: 'Projects',
        },
        timestamp: new Date(),
      });
    });

    // Should show navigation messages - get all navigation messages
    const navigationMessages = screen.getAllByText(/📍 Navigated to/);
    expect(navigationMessages.length).toBeGreaterThan(0);
    
    // Should show the latest navigation to Projects
    expect(screen.getByText('Projects')).toBeInTheDocument();
    
    // Should show "System:" prefix for system messages
    expect(screen.getAllByText('System:').length).toBeGreaterThan(0);
  });

  it('should use "Untitled" when tile has no name', () => {
    render(
      <TestWrapper>
        <ChatPanel />
      </TestWrapper>
    );

    // Emit navigation event with empty name (simulating tile without name)
    act(() => {
      testEventBus.emit({
        type: 'map.navigation',
        source: 'map_cache',
        payload: {
          fromCenterId: 'tile-1',
          toCenterId: 'tile-3',
          toCenterName: 'Untitled', // MapCache sends "Untitled" for tiles without names
        },
        timestamp: new Date(),
      });
    });

    // Should show "Untitled" for tiles without names
    const messages = screen.getAllByText(/📍 Navigated to/);
    expect(messages).toHaveLength(1);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
    // Should show "System:" prefix for system messages
    expect(screen.getAllByText('System:').length).toBeGreaterThan(0);
  });

  it('should show multiple navigation messages for different centers', () => {
    render(
      <TestWrapper>
        <ChatPanel />
      </TestWrapper>
    );

    // Emit first navigation event
    act(() => {
      testEventBus.emit({
        type: 'map.navigation',
        source: 'map_cache',
        payload: {
          fromCenterId: 'tile-1',
          toCenterId: 'tile-2',
          toCenterName: 'About',
        },
        timestamp: new Date(),
      });
    });

    // Should have one navigation message
    let navigationMessages = screen.getAllByText(/📍 Navigated to/);
    expect(navigationMessages).toHaveLength(1);
    expect(screen.getByText('About')).toBeInTheDocument();

    // Emit second navigation event to different center
    act(() => {
      testEventBus.emit({
        type: 'map.navigation',
        source: 'map_cache',
        payload: {
          fromCenterId: 'tile-2',
          toCenterId: 'tile-3',
          toCenterName: 'Projects',
        },
        timestamp: new Date(),
      });
    });

    // Should now have two navigation messages
    navigationMessages = screen.getAllByText(/📍 Navigated to/);
    expect(navigationMessages).toHaveLength(2);
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });
});