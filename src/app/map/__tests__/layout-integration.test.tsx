import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapPageContent } from '../_components/MapPageContent';
import { MapCacheProvider } from '../Cache/map-cache';
// ChatProvider has been removed in favor of event-driven architecture
import { ChatCacheProvider } from '../Chat/_cache/ChatCacheProvider';
import { EventBus } from '../Services/event-bus';
import React from 'react';

// Mock components
vi.mock('../Canvas', () => ({
  DynamicMapCanvas: () => <div data-testid="map-canvas">Map Canvas</div>,
}));

// Toolbox has been removed in favor of context menu interactions

vi.mock('../Controls/ParentHierarchy/parent-hierarchy', () => ({
  ParentHierarchy: () => <div data-testid="parent-hierarchy">Parent Hierarchy</div>,
}));

vi.mock('../Controls', () => ({
  MapControls: () => <div data-testid="map-controls">Map Controls</div>,
}));

vi.mock('../Chat/ChatPanel', () => ({
  ChatPanel: ({ className }: { className?: string }) => (
    <div data-testid="chat-panel" className={className}>
      Chat Panel
    </div>
  ),
}));

// Mock hooks
vi.mock('../hooks/useTileSelectForChat', () => ({
  useTileSelectForChat: () => ({
    handleTileSelect: vi.fn(),
  }),
}));

vi.mock('../Chat/_cache/hooks/useChatCacheOperations', () => ({
  useChatCacheOperations: () => ({
    dispatch: vi.fn(),
  }),
}));

describe('Layout with Chat Panel', () => {
  const defaultProps = {
    centerCoordinate: '1,2:A1',
    params: {
      center: '1',
      scale: '3',
      expandedItems: '',
    },
    rootItemId: 1,
    userId: 1,
    groupId: 2,
    isOffline: false,
  };

  it('should render canvas, hierarchy, and chat in correct order', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { container } = render(
      <MapCacheProvider
        initialItems={{}}
        initialCenter="1,2:A1"
        initialExpandedItems={[]}
        cacheConfig={{ maxAge: 300000, backgroundRefreshInterval: 30000, enableOptimisticUpdates: true, maxDepth: 3 }}
        offlineMode={false}
        mapContext={{ rootItemId: 1, userId: 1, groupId: 2 }}
        eventBus={new EventBus()}
      >
        <ChatCacheProvider eventBus={new EventBus()}>
          <MapPageContent {...defaultProps} />
        </ChatCacheProvider>
      </MapCacheProvider>
    );

    const canvas = screen.getByTestId('map-canvas');
    const hierarchy = screen.getByTestId('parent-hierarchy');
    const chat = screen.getByTestId('chat-panel');

    // Verify all components are rendered
    expect(canvas).toBeInTheDocument();
    expect(hierarchy).toBeInTheDocument();
    expect(chat).toBeInTheDocument();

    // Verify layout structure
    const layoutContainer = container.querySelector('.flex.h-full.w-full');
    expect(layoutContainer).toBeInTheDocument();
  });

  it('should give chat panel flex-1 to take remaining space', () => {
    render(
      <MapCacheProvider
        initialItems={{}}
        initialCenter="1,2:A1"
        initialExpandedItems={[]}
        cacheConfig={{ maxAge: 300000, backgroundRefreshInterval: 30000, enableOptimisticUpdates: true, maxDepth: 3 }}
        offlineMode={false}
        mapContext={{ rootItemId: 1, userId: 1, groupId: 2 }}
        eventBus={new EventBus()}
      >
        <ChatCacheProvider eventBus={new EventBus()}>
          <MapPageContent {...defaultProps} />
        </ChatCacheProvider>
      </MapCacheProvider>
    );

    const chatPanel = screen.getByTestId('chat-panel');
    expect(chatPanel).toHaveClass('flex-1', 'border-l', 'overflow-hidden');
  });

  it('should maintain minimum width for canvas (400px)', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { container } = render(
      <MapCacheProvider
        initialItems={{}}
        initialCenter="1,2:A1"
        initialExpandedItems={[]}
        cacheConfig={{ maxAge: 300000, backgroundRefreshInterval: 30000, enableOptimisticUpdates: true, maxDepth: 3 }}
        offlineMode={false}
        mapContext={{ rootItemId: 1, userId: 1, groupId: 2 }}
        eventBus={new EventBus()}
      >
        <ChatCacheProvider eventBus={new EventBus()}>
          <MapPageContent {...defaultProps} />
        </ChatCacheProvider>
      </MapCacheProvider>
    );

    const canvasWrapper = container.querySelector('[style*="minWidth"]');
    expect(canvasWrapper).toHaveStyle({ minWidth: '400px' });
  });

  it('should keep hierarchy at fixed width', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { container } = render(
      <MapCacheProvider
        initialItems={{}}
        initialCenter="1,2:A1"
        initialExpandedItems={[]}
        cacheConfig={{ maxAge: 300000, backgroundRefreshInterval: 30000, enableOptimisticUpdates: true, maxDepth: 3 }}
        offlineMode={false}
        mapContext={{ rootItemId: 1, userId: 1, groupId: 2 }}
        eventBus={new EventBus()}
      >
        <ChatCacheProvider eventBus={new EventBus()}>
          <MapPageContent {...defaultProps} />
        </ChatCacheProvider>
      </MapCacheProvider>
    );

    // Hierarchy doesn't have flex-1 class
    const hierarchy = screen.getByTestId('parent-hierarchy');
    
    expect(hierarchy.closest('.flex-1')).not.toBeInTheDocument();
  });

  it('should hide chat panel when isPanelOpen is false', () => {
    // Mock useChat to return isPanelOpen: false
    const mockUseChat = vi.fn(() => ({
      state: { isPanelOpen: false, selectedTileId: null, messages: [] },
      dispatch: vi.fn(),
    }));
    
    // Re-mock the useChatCacheOperations to return different value
    vi.doMock('../Chat/_cache/hooks/useChatCacheOperations', () => ({
      useChatCacheOperations: mockUseChat,
    }));

    render(
      <MapCacheProvider
        initialItems={{}}
        initialCenter="1,2:A1"
        initialExpandedItems={[]}
        cacheConfig={{ maxAge: 300000, backgroundRefreshInterval: 30000, enableOptimisticUpdates: true, maxDepth: 3 }}
        offlineMode={false}
        mapContext={{ rootItemId: 1, userId: 1, groupId: 2 }}
        eventBus={new EventBus()}
      >
        <ChatCacheProvider eventBus={new EventBus()}>
          <MapPageContent {...defaultProps} />
        </ChatCacheProvider>
      </MapCacheProvider>
    );

    expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument();
  });

  it('should apply correct border between map and chat', () => {
    render(
      <MapCacheProvider
        initialItems={{}}
        initialCenter="1,2:A1"
        initialExpandedItems={[]}
        cacheConfig={{ maxAge: 300000, backgroundRefreshInterval: 30000, enableOptimisticUpdates: true, maxDepth: 3 }}
        offlineMode={false}
        mapContext={{ rootItemId: 1, userId: 1, groupId: 2 }}
        eventBus={new EventBus()}
      >
        <ChatCacheProvider eventBus={new EventBus()}>
          <MapPageContent {...defaultProps} />
        </ChatCacheProvider>
      </MapCacheProvider>
    );

    const chatPanel = screen.getByTestId('chat-panel');
    expect(chatPanel).toHaveClass('border-l');
  });
});