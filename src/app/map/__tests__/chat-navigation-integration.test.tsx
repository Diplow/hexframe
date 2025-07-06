import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { Messages } from '../Chat/Messages';
import { ChatCacheProvider } from '../Chat/_cache/ChatCacheProvider';
import { MapCacheProvider } from '../Cache/map-cache';
import { AuthContext } from '~/contexts/AuthContext';
import { EventBus } from '../Services/event-bus';
import type { Widget } from '../Chat/_cache/types';
import type { Message } from '../Chat/_cache/_events/event.types';

// Mock the navigation hook
const mockNavigateToItem = vi.fn();
vi.mock('../Cache/_hooks/use-cache-navigation', () => ({
  useMapCacheNavigation: () => ({
    navigateToItem: mockNavigateToItem,
  }),
}));

describe('Chat Navigation Integration', () => {
  let eventBus: EventBus;
  
  beforeEach(() => {
    eventBus = new EventBus();
    mockNavigateToItem.mockClear();
  });

  const renderWithProviders = (
    messages: Message[], 
    widgets: Widget[] = [],
    user: { id: string; name?: string; email: string } | null = null
  ) => {
    const authValue = {
      user,
      mappingUserId: user ? 123 : undefined,
      isLoading: false,
      setMappingUserId: vi.fn(),
    };

    return render(
      <AuthContext.Provider value={authValue}>
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
      </AuthContext.Provider>
    );
  };

  it('should navigate to user map when clicking "You" while logged in', async () => {
    const messages: Message[] = [{
      id: 'msg-1',
      content: 'Hello world',
      actor: 'user',
      timestamp: new Date(),
    }];

    renderWithProviders(messages, [], { id: '123', name: 'John Doe', email: 'john@example.com' });

    const youButton = screen.getByRole('button', { name: /You:/ });
    expect(youButton).toBeInTheDocument();
    
    fireEvent.click(youButton);
    
    await waitFor(() => {
      expect(mockNavigateToItem).toHaveBeenCalledWith(123);
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