import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessages } from '../ChatMessages';
import { ChatProvider } from '../ChatProvider';

// Create a mock auth context that can be controlled
let mockUser: { id: string; email: string } | null = { id: 'test-user', email: 'test@example.com' };

vi.mock('~/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: vi.fn(),
  }),
}));

// Mock the map cache
vi.mock('../../Cache/_hooks/use-map-cache', () => ({
  useMapCache: () => ({
    items: {},
    updateItemOptimistic: vi.fn(),
    createItemOptimistic: vi.fn(),
  }),
}));

// Mock EventBus
const mockEventBus = {
  emit: vi.fn(),
  on: vi.fn().mockReturnValue(() => undefined),
  off: vi.fn(),
};

describe('Chat Day Separator', () => {
  it('should show day separator before welcome message with logged in user', () => {
    mockUser = { id: 'test-user', email: 'john.doe@example.com' };
    
    render(
      <ChatProvider eventBus={mockEventBus as unknown as Parameters<typeof ChatProvider>[0]['eventBus']}>
        <ChatMessages messages={[]} widgets={[]} />
      </ChatProvider>
    );
    
    // Get today's date
    const today = new Date();
    const day = today.getDate();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[today.getMonth()];
    const year = today.getFullYear();
    const expectedDate = `${day} ${month} ${year}`;
    
    // Check that the day separator appears
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
    
    // Check that the welcome message appears with user's name
    expect(screen.getByText(/Welcome to Hexframe,/)).toBeInTheDocument();
    expect(screen.getByText('john.doe')).toBeInTheDocument();
    expect(screen.getByText('Hexframe:')).toBeInTheDocument();
  });
  
  it('should show "Guest" when user is not logged in', () => {
    mockUser = null;
    
    render(
      <ChatProvider eventBus={mockEventBus as unknown as Parameters<typeof ChatProvider>[0]['eventBus']}>
        <ChatMessages messages={[]} widgets={[]} />
      </ChatProvider>
    );
    
    // Check that the welcome message shows "Guest"
    expect(screen.getByText(/Welcome to Hexframe,/)).toBeInTheDocument();
    expect(screen.getByText('Guest')).toBeInTheDocument();
  });
  
  it('should show new day separator when message is from a different day', () => {
    // Create a message from yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messages = [{
      id: '1',
      content: 'Hello from yesterday',
      actor: 'user' as const,
      timestamp: yesterday,
    }];
    
    render(
      <ChatProvider eventBus={mockEventBus as unknown as Parameters<typeof ChatProvider>[0]['eventBus']}>
        <ChatMessages messages={messages} widgets={[]} />
      </ChatProvider>
    );
    
    // Should see two day separators - one for today (welcome) and one for yesterday
    const today = new Date();
    const todayFormatted = `${today.getDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'][today.getMonth()]} ${today.getFullYear()}`;
    
    const yesterdayFormatted = `${yesterday.getDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'][yesterday.getMonth()]} ${yesterday.getFullYear()}`;
    
    expect(screen.getByText(todayFormatted)).toBeInTheDocument();
    expect(screen.getByText(yesterdayFormatted)).toBeInTheDocument();
    expect(screen.getByText('Hello from yesterday')).toBeInTheDocument();
  });
  
  it('should not show duplicate day separator for messages on same day as welcome', () => {
    // Create a message from today
    const now = new Date();
    
    const messages = [{
      id: '1',
      content: 'Hello from today',
      actor: 'user' as const,
      timestamp: now,
    }];
    
    render(
      <ChatProvider eventBus={mockEventBus as unknown as Parameters<typeof ChatProvider>[0]['eventBus']}>
        <ChatMessages messages={messages} widgets={[]} />
      </ChatProvider>
    );
    
    // Should only see one day separator for today
    const todayFormatted = `${now.getDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'][now.getMonth()]} ${now.getFullYear()}`;
    
    const daySeparators = screen.getAllByText(todayFormatted);
    expect(daySeparators).toHaveLength(1);
    
    expect(screen.getByText(/Welcome to Hexframe,/)).toBeInTheDocument();
    expect(screen.getByText(/Select a tile to explore its content/)).toBeInTheDocument();
    expect(screen.getByText('Hello from today')).toBeInTheDocument();
  });
});