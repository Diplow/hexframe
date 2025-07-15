import { vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { ChatCacheProvider } from '../Cache/ChatCacheProvider';
import { EventBus } from '../../Services/EventBus/event-bus';
import type { ChatEvent } from '../Cache/_events/event.types';
import { AuthProvider } from '~/contexts/AuthContext';

// Mock all the required dependencies for Chat components
export function setupChatMocks() {
  vi.mock('../../Cache/_hooks/use-map-cache', () => ({
    useMapCache: () => ({
      updateItemOptimistic: vi.fn(),
    }),
  }));

  vi.mock('~/contexts/AuthContext', () => ({
    useAuth: () => ({
      user: null,
    }),
  }));

  vi.mock('next/navigation', () => ({
    useRouter: () => ({
      push: vi.fn(),
    }),
  }));

  vi.mock('~/commons/trpc/react', () => ({
    api: {
      useUtils: () => ({}),
      map: {
        user: {
          createDefaultMapForCurrentUser: {
            useMutation: () => ({
              mutate: vi.fn(),
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

  // Mock widget components
  vi.mock('../Widgets/PreviewWidget', () => ({
    PreviewWidget: ({ title, content }: { title: string; content: string }) => (
      <div data-testid="preview-widget">
        <h3>{title}</h3>
        <p>{content}</p>
      </div>
    ),
  }));

  vi.mock('../Widgets/CreationWidget', () => ({
    CreationWidget: () => <div data-testid="creation-widget">Creation Widget</div>,
  }));

  vi.mock('../Widgets/LoginWidget', () => ({
    LoginWidget: () => <div data-testid="login-widget">Login Widget</div>,
  }));

  vi.mock('../Widgets/ConfirmDeleteWidget', () => ({
    ConfirmDeleteWidget: () => <div data-testid="confirm-delete-widget">Confirm Delete Widget</div>,
  }));

  vi.mock('../Widgets/LoadingWidget', () => ({
    LoadingWidget: () => <div data-testid="loading-widget">Loading Widget</div>,
  }));

  vi.mock('../Widgets/ErrorWidget', () => ({
    ErrorWidget: () => <div data-testid="error-widget">Error Widget</div>,
  }));
}

// Helper to render components with ChatCacheProvider
export function renderWithChatProvider(
  ui: React.ReactElement,
  eventBus?: EventBus,
  initialEvents?: ChatEvent[]
) {
  const bus = eventBus ?? new EventBus();
  return render(
    <AuthProvider>
      <ChatCacheProvider eventBus={bus} initialEvents={initialEvents ?? []}>
        {ui}
      </ChatCacheProvider>
    </AuthProvider>
  );
}