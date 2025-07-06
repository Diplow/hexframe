import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatMessages } from '../Chat/ChatMessages';
import { ChatCacheProvider } from '../Chat/_cache/ChatCacheProvider';
import { AuthContext } from '~/contexts/AuthContext';
import { EventBus } from '../Services/event-bus';
import type { Widget } from '../Chat/_cache/types';
import type { Message } from '../Chat/_cache/_events/event.types';

describe('Chat Date Tooltip', () => {
  const mockAuthValue = {
    user: null,
    mappingUserId: undefined,
    isLoading: false,
    error: null,
    setMappingUserId: vi.fn(),
  };

  const renderWithProviders = (messages: Message[]) => {
    const eventBus = new EventBus();
    
    return render(
      <AuthContext.Provider value={mockAuthValue}>
        <ChatCacheProvider eventBus={eventBus}>
          <ChatMessages messages={messages} widgets={[]} />
        </ChatCacheProvider>
      </AuthContext.Provider>
    );
  };

  it('should show full date in tooltip on day separator', () => {
    const today = new Date();
    const messages: Message[] = [{
      id: 'msg-1',
      content: 'Hello world',
      actor: 'user',
      timestamp: today,
    }];

    renderWithProviders(messages);

    // Find the day separator
    const daySeparator = screen.getByTestId('chat-day-separator');
    expect(daySeparator).toHaveTextContent('Today');

    // Check the parent element has the title attribute with full date
    const separatorContainer = daySeparator.parentElement;
    expect(separatorContainer).toHaveAttribute('title');
    
    const fullDate = today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    expect(separatorContainer?.getAttribute('title')).toBe(fullDate);
  });

  it('should show correct date for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messages: Message[] = [{
      id: 'msg-1',
      content: 'Hello yesterday',
      actor: 'user',
      timestamp: yesterday,
    }];

    renderWithProviders(messages);

    const daySeparator = screen.getByTestId('chat-day-separator');
    expect(daySeparator).toHaveTextContent('Yesterday');

    // Check tooltip shows full date
    const separatorContainer = daySeparator.parentElement;
    const fullDate = yesterday.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    expect(separatorContainer?.getAttribute('title')).toBe(fullDate);
  });

  it('should show full date for older messages', () => {
    const oldDate = new Date('2024-01-15');
    const messages: Message[] = [{
      id: 'msg-1',
      content: 'Old message',
      actor: 'system',
      timestamp: oldDate,
    }];

    renderWithProviders(messages);

    const daySeparator = screen.getByTestId('chat-day-separator');
    
    // Should show the full formatted date
    const expectedText = oldDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    expect(daySeparator).toHaveTextContent(expectedText);

    // Tooltip should also have the same date
    const separatorContainer = daySeparator.parentElement;
    expect(separatorContainer?.getAttribute('title')).toBe(expectedText);
  });

  it('should group messages by day correctly', () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messages: Message[] = [
      {
        id: 'msg-1',
        content: 'Yesterday message',
        actor: 'user',
        timestamp: yesterday,
      },
      {
        id: 'msg-2',
        content: 'Today message',
        actor: 'system',
        timestamp: today,
      },
    ];

    renderWithProviders(messages);

    const daySeparators = screen.getAllByTestId('chat-day-separator');
    expect(daySeparators).toHaveLength(2);
    expect(daySeparators[0]).toHaveTextContent('Yesterday');
    expect(daySeparators[1]).toHaveTextContent('Today');
  });
});