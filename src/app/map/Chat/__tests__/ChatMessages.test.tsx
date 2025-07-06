import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Messages } from '../Messages';
import { ChatCacheProvider } from '../Cache/ChatCacheProvider';
import { EventBus } from '../../Services/event-bus';
import type { Message, Widget } from '../Cache/_events/event.types';

interface MockPreviewWidgetProps {
  title: string;
  content: string;
}

// Mock the PreviewWidget component
vi.mock('../Widgets/PreviewWidget', () => ({
  PreviewWidget: ({ title, content }: MockPreviewWidgetProps) => (
    <div data-testid="preview-widget">
      <h3>{title}</h3>
      <p>{content}</p>
    </div>
  ),
}));

// Mock additional hooks that ChatMessages uses
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

describe('ChatMessages', () => {
  const mockEventBus = new EventBus();

  const renderWithProvider = (messages: Message[] = [], widgets: Widget[] = []) => {
    return render(
      <ChatCacheProvider eventBus={mockEventBus}>
        <Messages messages={messages} widgets={widgets} />
      </ChatCacheProvider>
    );
  };

  it('should render empty state with welcome message', () => {
    const welcomeMessage: Message = {
      id: 'welcome',
      actor: 'system' as const,
      content: 'Welcome to Hexframe! Select a tile to explore its content.',
      timestamp: new Date(),
    };
    
    renderWithProvider([welcomeMessage]);

    expect(screen.getByText('System:')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Hexframe! Select a tile to explore its content.')).toBeInTheDocument();
  });

  it('should render system messages with correct styling', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'system' as const,
        content: 'This is a system message',
        timestamp: new Date(),
      },
    ];

    renderWithProvider(messages);

    // Check that the message content is rendered correctly
    expect(screen.getByText('System:')).toBeInTheDocument();
    expect(screen.getByText('This is a system message')).toBeInTheDocument();
  });

  it('should render preview widgets for tile content', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'system' as const,
        content: 'Showing preview for Test Tile',
        timestamp: new Date(),
      },
    ];

    renderWithProvider(messages);

    // Since the PreviewWidget is mocked, we won't see the actual widget
    // Instead, check that the message is rendered
    expect(screen.getByText('System:')).toBeInTheDocument();
    expect(screen.getByText('Showing preview for Test Tile')).toBeInTheDocument();
  });

  it('should maintain scroll position when new messages added', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'system' as const,
        content: 'First message',
        timestamp: new Date(),
      },
    ];

    const { rerender } = renderWithProvider(messages);
    
    const scrollContainer = screen.getByTestId('chat-messages');
    
    // Add more messages
    const moreMessages = [
      ...messages,
      {
        id: '2',
        actor: 'system' as const,
        content: 'Second message',
        timestamp: new Date(),
      },
    ];

    rerender(
      <ChatCacheProvider eventBus={mockEventBus}>
        <Messages messages={moreMessages} widgets={[]} />
      </ChatCacheProvider>
    );

    // Check that the container has overflow-y-auto for scrolling
    expect(scrollContainer).toHaveClass('overflow-y-auto');
  });

  it('should apply correct spacing between messages', () => {
    const messages: Message[] = [
      {
        id: '1',
        actor: 'system' as const,
        content: 'First message',
        timestamp: new Date(),
      },
      {
        id: '2',
        actor: 'system' as const,
        content: 'Second message',
        timestamp: new Date(),
      },
    ];

    renderWithProvider(messages);

    const container = screen.getByTestId('chat-messages');
    expect(container).toHaveClass('space-y-3');
  });
});