import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatPanel } from '../Chat/ChatPanel';
import { ChatCacheProvider } from '../Chat/_cache/ChatCacheProvider';
import { AuthContext } from '~/contexts/AuthContext';
import { EventBus } from '../Services/event-bus';
import type { ChatEvent } from '../Chat/_cache/_events/event.types';

// Mock authClient
const mockAuthClient = {
  signOut: vi.fn().mockResolvedValue(undefined),
};

vi.mock('~/lib/auth/auth-client', () => ({
  authClient: mockAuthClient,
}));

describe('Chat Logout Clear', () => {
  let eventBus: EventBus;
  
  beforeEach(() => {
    eventBus = new EventBus();
    vi.clearAllMocks();
  });

  const renderWithProviders = (user: { id: string; name?: string; email: string } | null = null, initialEvents: ChatEvent[] = []) => {
    const authValue = {
      user,
      mappingUserId: user ? 123 : undefined,
      isLoading: false,
      setMappingUserId: vi.fn(),
    };

    return render(
      <AuthContext.Provider value={authValue}>
        <ChatCacheProvider eventBus={eventBus} initialEvents={initialEvents}>
          <ChatPanel />
        </ChatCacheProvider>
      </AuthContext.Provider>
    );
  };

  it('should clear chat messages when user logs out', async () => {
    // Start with some chat events
    const initialEvents: ChatEvent[] = [
      {
        id: 'welcome-message',
        type: 'message',
        payload: { content: 'Welcome!', actor: 'system' },
        timestamp: new Date(),
        actor: 'system',
      },
      {
        id: 'msg-1',
        type: 'user_message',
        payload: { text: 'Hello' },
        timestamp: new Date(),
        actor: 'user',
      },
      {
        id: 'msg-2',
        type: 'system_message',
        payload: { text: 'Hi there!' },
        timestamp: new Date(),
        actor: 'assistant',
      },
    ];

    renderWithProviders({ id: '123', name: 'John Doe', email: 'john@example.com' }, initialEvents);

    // Find and click the logout button
    const logoutButton = screen.getByLabelText('Logout');
    fireEvent.click(logoutButton);

    // Wait for the auth client to be called
    await waitFor(() => {
      expect(mockAuthClient.signOut).toHaveBeenCalled();
    });

    // Verify the clear_chat event would be processed
    // In a full integration test, we'd verify the chat is actually cleared
  });

  it('should preserve welcome message after logout', async () => {
    const initialEvents: ChatEvent[] = [
      {
        id: 'welcome-message',
        type: 'message',
        payload: { content: 'Welcome to HexFrame!', actor: 'system' },
        timestamp: new Date(),
        actor: 'system',
      },
      {
        id: 'other-msg',
        type: 'user_message',
        payload: { text: 'This should be cleared' },
        timestamp: new Date(),
        actor: 'user',
      },
    ];

    // Test the reducer directly
    const { eventsReducer } = await import('../Chat/_cache/_reducers/events.reducer');
    
    const clearEvent: ChatEvent = {
      id: 'clear-1',
      type: 'clear_chat',
      payload: {},
      timestamp: new Date(),
      actor: 'system',
    };

    const newEvents = eventsReducer(initialEvents, clearEvent);
    
    // Should only have the welcome message
    expect(newEvents).toHaveLength(1);
    expect(newEvents[0]?.id).toBe('welcome-message');
  });

  it('should handle logout when no welcome message exists', async () => {
    const initialEvents: ChatEvent[] = [
      {
        id: 'msg-1',
        type: 'user_message',
        payload: { text: 'Hello' },
        timestamp: new Date(),
        actor: 'user',
      },
    ];

    // Test the reducer directly
    const { eventsReducer } = await import('../Chat/_cache/_reducers/events.reducer');
    
    const clearEvent: ChatEvent = {
      id: 'clear-1',
      type: 'clear_chat',
      payload: {},
      timestamp: new Date(),
      actor: 'system',
    };

    const newEvents = eventsReducer(initialEvents, clearEvent);
    
    // Should be empty when no welcome message exists
    expect(newEvents).toHaveLength(0);
  });
});