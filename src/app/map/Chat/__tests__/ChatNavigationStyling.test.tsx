import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatMessages } from '../ChatMessages';
import type { ChatMessage } from '../types';

// Mock the PreviewWidget component
vi.mock('../Widgets/PreviewWidget', () => ({
  PreviewWidget: () => <div data-testid="preview-widget">Preview</div>,
}));

// Mock navigation
const mockNavigateToItem = vi.fn();

// Mock the useMapCache hook
const mockUseMapCache = vi.fn(() => ({
  items: {
    'tile-dashboard-123': {
      metadata: { dbId: 456 },
    },
  },
  navigateToItem: mockNavigateToItem,
}));

vi.mock('../../Cache/_hooks/use-map-cache', () => ({
  useMapCache: () => mockUseMapCache(),
}));

describe('Chat Navigation Message Styling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should render navigation messages without System: prefix', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'system',
        content: '📍 Navigated to **Home**',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    // Should show the navigation message
    expect(screen.getByText(/📍 Navigated to/)).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    
    // Should NOT show "System:" prefix
    expect(screen.queryByText('System:')).not.toBeInTheDocument();
  });

  it('should apply smaller, muted, italic styling to navigation messages', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'system',
        content: '📍 Navigated to **Projects**',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    const messageElement = screen.getByTestId('chat-message-1');
    const textContainer = messageElement.querySelector('.text-xs.text-muted-foreground.italic');
    
    expect(textContainer).toBeInTheDocument();
    
    // The paragraph should also have muted color
    const paragraph = messageElement.querySelector('p');
    expect(paragraph).toHaveClass('my-0');
  });
  
  it('should make navigation tile names clickable', async () => {
    const user = userEvent.setup();
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'system',
        content: '📍 Navigated to **Dashboard**',
        metadata: { 
          timestamp: new Date(),
          tileId: 'tile-dashboard-123',
        },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    const tileName = screen.getByText('Dashboard');
    expect(tileName).toHaveClass('cursor-pointer');
    
    // Click the tile name
    await user.click(tileName);
    
    // Should navigate to the tile using coordId
    expect(mockNavigateToItem).toHaveBeenCalledWith('tile-dashboard-123');
  });

  it('should render regular system messages with System: prefix', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'system',
        content: 'Connection established',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    // Should show "System:" for non-navigation system messages
    expect(screen.getByText('System:')).toBeInTheDocument();
    expect(screen.getByText('Connection established')).toBeInTheDocument();
  });

  it('should handle mixed messages correctly', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'system',
        content: '📍 Navigated to **Dashboard**',
        metadata: { timestamp: new Date() },
      },
      {
        id: '2',
        type: 'user',
        content: 'Hello, can you help me?',
        metadata: { timestamp: new Date() },
      },
      {
        id: '3',
        type: 'system',
        content: 'System maintenance scheduled',
        metadata: { timestamp: new Date() },
      },
    ];

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    // Navigation message should not have System:
    expect(screen.getByText(/📍 Navigated to/)).toBeInTheDocument();
    
    // User message should have You:
    expect(screen.getByText('You:')).toBeInTheDocument();
    
    // Regular system message should have System:
    expect(screen.getByText('System:')).toBeInTheDocument();
    expect(screen.getByText('System maintenance scheduled')).toBeInTheDocument();
  });

  it('should navigate using coordId from tile metadata', async () => {
    const user = userEvent.setup();
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'system',
        content: '📍 Navigated to **Test Tile**',
        metadata: { 
          timestamp: new Date(),
          tileId: 'user1,group1:test-coord-123', // This is the coordId
        },
      },
    ];

    // Update mock to include the navigateToItem function
    mockUseMapCache.mockReturnValue({
      items: {
        'user1,group1:test-coord-123': {
          metadata: { dbId: '789' },
        },
      },
      navigateToItem: mockNavigateToItem,
    });

    render(<ChatMessages messages={messages} expandedPreviewId={null} />);

    const tileName = screen.getByText('Test Tile');
    
    // Click the tile name
    await user.click(tileName);
    
    // Should navigate using coordId
    expect(mockNavigateToItem).toHaveBeenCalledWith('user1,group1:test-coord-123');
  });
});