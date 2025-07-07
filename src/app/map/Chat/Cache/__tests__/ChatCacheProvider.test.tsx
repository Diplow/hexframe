import '~/test/setup'; // Import test setup FIRST
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatCacheProvider, useChatCache } from '../ChatCacheProvider';
import { createMockEventBus } from '~/test-utils/event-bus';
import type { ChatEvent } from '../_events/event.types';
import type { EventBus } from '../../../Services/event-bus';

// Test component to access chat cache context
function TestComponent() {
  const { state, dispatch } = useChatCache();
  
  return (
    <div>
      <div data-testid="event-count">{state.events.length}</div>
      <div data-testid="message-count">{state.visibleMessages.length}</div>
      <div data-testid="widget-count">{state.activeWidgets.length}</div>
      
      <button onClick={() => dispatch({
        id: 'test-1',
        type: 'user_message',
        payload: { text: 'Test message' },
        timestamp: new Date(),
        actor: 'user',
      })}>Add Event</button>
      
      <button onClick={() => dispatch({
        id: 'clear-' + Date.now(),
        type: 'clear_chat',
        payload: {},
        timestamp: new Date(),
        actor: 'system',
      })}>Clear Events</button>
      <button onClick={() => console.log('Remove not implemented')}>Remove Event</button>
      
      <div data-testid="messages">
        {state.visibleMessages.map((msg: { id: string; content: string }) => (
          <div key={msg.id}>{msg.content}</div>
        ))}
      </div>
      
      <div data-testid="widgets">
        {state.activeWidgets.map((widget: { id: string; type: string }) => (
          <div key={widget.id}>{widget.type}</div>
        ))}
      </div>
    </div>
  );
}

describe('ChatCacheProvider', () => {
  it('should provide initial empty state', () => {
    const eventBus = createMockEventBus() as unknown as EventBus;
    
    render(
      <ChatCacheProvider eventBus={eventBus}>
        <TestComponent />
      </ChatCacheProvider>
    );
    
    expect(screen.getByTestId('event-count')).toHaveTextContent('0');
    expect(screen.getByTestId('message-count')).toHaveTextContent('0');
    expect(screen.getByTestId('widget-count')).toHaveTextContent('0');
  });
  
  it('should add events and derive messages', async () => {
    const eventBus = createMockEventBus() as unknown as EventBus;
    const user = userEvent.setup();
    
    render(
      <ChatCacheProvider eventBus={eventBus}>
        <TestComponent />
      </ChatCacheProvider>
    );
    
    await user.click(screen.getByText('Add Event'));
    
    expect(screen.getByTestId('event-count')).toHaveTextContent('1');
    expect(screen.getByTestId('message-count')).toHaveTextContent('1');
    expect(screen.getByTestId('messages')).toHaveTextContent('Test message');
  });
  
  it('should clear all events', async () => {
    const eventBus = createMockEventBus() as unknown as EventBus;
    const user = userEvent.setup();
    
    render(
      <ChatCacheProvider eventBus={eventBus}>
        <TestComponent />
      </ChatCacheProvider>
    );
    
    // Add an event first
    await user.click(screen.getByText('Add Event'));
    expect(screen.getByTestId('event-count')).toHaveTextContent('1');
    
    // Clear events - this adds a logout message, so we expect 1 event
    await user.click(screen.getByText('Clear Events'));
    expect(screen.getByTestId('event-count')).toHaveTextContent('1'); // Logout message
    expect(screen.getByTestId('message-count')).toHaveTextContent('1'); // Logout message is visible
    
    // Check that the message is the logout message
    expect(screen.getByTestId('messages')).toHaveTextContent('You have been logged out');
  });
  
  it.skip('should remove specific event', async () => {
    const eventBus = createMockEventBus() as unknown as EventBus;
    const user = userEvent.setup();
    
    render(
      <ChatCacheProvider eventBus={eventBus}>
        <TestComponent />
      </ChatCacheProvider>
    );
    
    // Add an event
    await user.click(screen.getByText('Add Event'));
    expect(screen.getByTestId('event-count')).toHaveTextContent('1');
    
    // Remove the event
    await user.click(screen.getByText('Remove Event'));
    expect(screen.getByTestId('event-count')).toHaveTextContent('0');
  });
  
  it('should handle initial events', () => {
    const eventBus = createMockEventBus() as unknown as EventBus;
    const initialEvents: ChatEvent[] = [
      {
        id: '1',
        type: 'system_message',
        payload: { text: 'Welcome!' },
        timestamp: new Date(),
        actor: 'system',
      },
    ];
    
    render(
      <ChatCacheProvider eventBus={eventBus} initialEvents={initialEvents}>
        <TestComponent />
      </ChatCacheProvider>
    );
    
    expect(screen.getByTestId('event-count')).toHaveTextContent('1');
    expect(screen.getByTestId('message-count')).toHaveTextContent('1');
    expect(screen.getByTestId('message-count')).toHaveTextContent('1');
  });
  
  it('should derive widgets from events', () => {
    const eventBus = createMockEventBus() as unknown as EventBus;
    const initialEvents: ChatEvent[] = [
      {
        id: '1',
        type: 'tile_selected',
        payload: {
          tileId: 'tile-123',
          tileData: { id: 'tile-123', name: 'Test Tile' },
        },
        timestamp: new Date(),
        actor: 'user',
      },
    ];
    
    render(
      <ChatCacheProvider eventBus={eventBus} initialEvents={initialEvents}>
        <TestComponent />
      </ChatCacheProvider>
    );
    
    expect(screen.getByTestId('widget-count')).toHaveTextContent('1');
    expect(screen.getByTestId('widgets')).toHaveTextContent('preview');
  });
  
  it('should listen to map events from eventBus', () => {
    const eventBus = createMockEventBus() as unknown as EventBus;
    
    render(
      <ChatCacheProvider eventBus={eventBus}>
        <TestComponent />
      </ChatCacheProvider>
    );
    
    // Simulate a map event
    act(() => {
      eventBus.emit({
        type: 'map.tile_created',
        source: 'map_cache',
        payload: {
          tileId: 'new-tile',
          tileName: 'New Tile',
          coordId: '0,0,0',
        },
      });
    });
    
    // Should create a system message
    expect(screen.getByTestId('message-count')).toHaveTextContent('1');
    expect(screen.getByTestId('messages')).toHaveTextContent('Created "New Tile"');
  });
  
  it('should handle multiple map event types', () => {
    const eventBus = createMockEventBus() as unknown as EventBus;
    
    render(
      <ChatCacheProvider eventBus={eventBus}>
        <TestComponent />
      </ChatCacheProvider>
    );
    
    // Emit various map events
    act(() => {
      eventBus.emit({
        type: 'map.tile_updated',
        source: 'map_cache',
        payload: {
          tileId: 'tile-1',
          tileName: 'Updated Tile',
          changes: { content: 'new content' },
        },
      });
      
      eventBus.emit({
        type: 'map.tiles_swapped',
        source: 'map_cache',
        payload: {
          tile1Id: 'tile-1',
          tile2Id: 'tile-2',
          tile1Name: 'Tile A',
          tile2Name: 'Tile B',
        },
      });
    });
    
    expect(screen.getByTestId('message-count')).toHaveTextContent('2');
  });
  
  it('should unsubscribe from eventBus on unmount', () => {
    const eventBus = createMockEventBus() as unknown as EventBus;
    const unsubscribeSpy = vi.fn();
    const onSpy = vi.spyOn(eventBus, 'on').mockReturnValue(unsubscribeSpy);
    
    const { unmount } = render(
      <ChatCacheProvider eventBus={eventBus}>
        <TestComponent />
      </ChatCacheProvider>
    );
    
    // Check that all expected listeners are registered
    expect(onSpy).toHaveBeenCalledWith('map.*', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('auth.*', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('error.*', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('*', expect.any(Function));
    expect(unsubscribeSpy).not.toHaveBeenCalled();
    
    unmount();
    
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
  
  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty to suppress console errors in test
    });
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useChatCache must be used within ChatCacheProvider');
    
    consoleSpy.mockRestore();
  });
});