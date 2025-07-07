import '~/test/setup'; // Import test setup FIRST
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatProvider } from '../ChatProvider';
import { ChatPanel } from '../ChatPanel';
import { EventBus } from '../../Services/event-bus';
import { AuthProvider } from '~/contexts/AuthContext';
import type { ChatEvent } from '../Cache/_events/event.types';

// Create mock EventBus
let mockEventBus: EventBus;

beforeEach(() => {
  mockEventBus = new EventBus();
});

// Mock the tRPC hook for user map creation
vi.mock('~/commons/trpc/react', () => ({
  api: {
    useUtils: () => ({}),
    map: {
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

describe('Chat Integration', () => {
  it('should display sent messages in the chat', async () => {
    const user = userEvent.setup();
    
    // Add welcome event
    const welcomeEvent: ChatEvent = {
      type: 'message',
      payload: {
        content: 'Welcome to **HexFrame**! Navigate the map by clicking on tiles, or use the chat to ask questions.',
        actor: 'system',
      },
      id: 'welcome-message',
      timestamp: new Date(),
      actor: 'system',
    };
    
    render(
      <AuthProvider>
        <ChatProvider eventBus={mockEventBus} initialEvents={[welcomeEvent]}>
          <ChatPanel />
        </ChatProvider>
      </AuthProvider>
    );
    
    const input = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByTestId('send-button');
    
    // Send first message
    await user.type(input, 'Hello, this is my first message');
    await user.click(sendButton);
    
    // Check that the message appears in the chat - look for "Guest (you):" since we're not logged in
    expect(screen.getByText('Guest (you):')).toBeInTheDocument();
    expect(screen.getByText('Hello, this is my first message')).toBeInTheDocument();
    
    // Send second message
    await user.type(input, 'This is another message');
    await user.keyboard('{Enter}');
    
    // Check that both messages are displayed
    expect(screen.getAllByText('Guest (you):')).toHaveLength(2);
    expect(screen.getByText('This is another message')).toBeInTheDocument();
  });
  
  it('should maintain message order', async () => {
    const user = userEvent.setup();
    
    // Add welcome event
    const welcomeEvent: ChatEvent = {
      type: 'message',
      payload: {
        content: 'Welcome to **HexFrame**! Navigate the map by clicking on tiles, or use the chat to ask questions.',
        actor: 'system',
      },
      id: 'welcome-message',
      timestamp: new Date(),
      actor: 'system',
    };
    
    render(
      <AuthProvider>
        <ChatProvider eventBus={mockEventBus} initialEvents={[welcomeEvent]}>
          <ChatPanel />
        </ChatProvider>
      </AuthProvider>
    );
    
    const input = screen.getByPlaceholderText('Type a message...');
    
    // Send multiple messages
    await user.type(input, 'First message');
    await user.keyboard('{Enter}');
    
    await user.type(input, 'Second message');
    await user.keyboard('{Enter}');
    
    await user.type(input, 'Third message');
    await user.keyboard('{Enter}');
    
    // Look for all elements containing user messages (not by test id)
    const firstMessage = screen.getByText('First message');
    const secondMessage = screen.getByText('Second message');
    const thirdMessage = screen.getByText('Third message');
    
    // All messages should be present
    expect(firstMessage).toBeInTheDocument();
    expect(secondMessage).toBeInTheDocument();
    expect(thirdMessage).toBeInTheDocument();
    
    // Verify order by checking their parent container positions
    const messageContainers = screen.getAllByText('Guest (you):').map(el => el.parentElement);
    expect(messageContainers).toHaveLength(3);
    
    // Messages should appear in order they were sent
    expect(messageContainers[0]).toHaveTextContent('First message');
    expect(messageContainers[1]).toHaveTextContent('Second message');
    expect(messageContainers[2]).toHaveTextContent('Third message');
  });
  
  it('should show welcome message initially', () => {
    // Add welcome event
    const welcomeEvent: ChatEvent = {
      type: 'message',
      payload: {
        content: 'Welcome to **HexFrame**! Navigate the map by clicking on tiles, or use the chat to ask questions.',
        actor: 'system',
      },
      id: 'welcome-message',
      timestamp: new Date(),
      actor: 'system',
    };
    
    render(
      <AuthProvider>
        <ChatProvider eventBus={mockEventBus} initialEvents={[welcomeEvent]}>
          <ChatPanel />
        </ChatProvider>
      </AuthProvider>
    );
    
    expect(screen.getByText('System:')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to/)).toBeInTheDocument();
    expect(screen.getByText('HexFrame')).toBeInTheDocument();
  });
});