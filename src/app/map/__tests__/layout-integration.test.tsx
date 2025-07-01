import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapPageContent } from '../_components/MapPageContent';
import { MapCacheProvider } from '../Cache/map-cache';
import { ChatProvider } from '../Chat/ChatProvider';

// Mock components
vi.mock('../Canvas', () => ({
  DynamicMapCanvas: () => <div data-testid="map-canvas">Map Canvas</div>,
}));

vi.mock('../Controls/Toolbox/Toolbox', () => ({
  Toolbox: () => <div data-testid="toolbox">Toolbox</div>,
}));

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

vi.mock('../Chat/ChatProvider', () => ({
  useChat: () => ({
    state: { isPanelOpen: true, selectedTileId: null, messages: [] },
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

  it('should render toolbox, canvas, hierarchy, and chat in correct order', () => {
    const { container } = render(
      <ChatProvider>
        <MapPageContent {...defaultProps} />
      </ChatProvider>
    );

    const toolbox = screen.getByTestId('toolbox');
    const canvas = screen.getByTestId('map-canvas');
    const hierarchy = screen.getByTestId('parent-hierarchy');
    const chat = screen.getByTestId('chat-panel');

    // Verify all components are rendered
    expect(toolbox).toBeInTheDocument();
    expect(canvas).toBeInTheDocument();
    expect(hierarchy).toBeInTheDocument();
    expect(chat).toBeInTheDocument();

    // Verify layout structure
    const layoutContainer = container.querySelector('.flex.h-full.w-full');
    expect(layoutContainer).toBeInTheDocument();
  });

  it('should give chat panel flex-1 to take remaining space', () => {
    render(
      <ChatProvider>
        <MapPageContent {...defaultProps} />
      </ChatProvider>
    );

    const chatPanel = screen.getByTestId('chat-panel');
    expect(chatPanel).toHaveClass('flex-1', 'border-l', 'overflow-hidden');
  });

  it('should maintain minimum width for canvas (400px)', () => {
    const { container } = render(
      <ChatProvider>
        <MapPageContent {...defaultProps} />
      </ChatProvider>
    );

    const canvasWrapper = container.querySelector('[style*="minWidth"]');
    expect(canvasWrapper).toHaveStyle({ minWidth: '400px' });
  });

  it('should keep toolbox and hierarchy at fixed widths', () => {
    const { container } = render(
      <ChatProvider>
        <MapPageContent {...defaultProps} />
      </ChatProvider>
    );

    // Toolbox and hierarchy don't have flex-1 class
    const toolbox = screen.getByTestId('toolbox');
    const hierarchy = screen.getByTestId('parent-hierarchy');
    
    expect(toolbox.closest('.flex-1')).not.toBeInTheDocument();
    expect(hierarchy.closest('.flex-1')).not.toBeInTheDocument();
  });

  it('should hide chat panel when isPanelOpen is false', () => {
    // Mock useChat to return isPanelOpen: false
    const mockUseChat = vi.fn(() => ({
      state: { isPanelOpen: false, selectedTileId: null, messages: [] },
      dispatch: vi.fn(),
    }));
    
    // Re-mock the useChat to return different value
    vi.doMock('../Chat/ChatProvider', () => ({
      useChat: mockUseChat,
    }));

    render(
      <ChatProvider>
        <MapPageContent {...defaultProps} />
      </ChatProvider>
    );

    expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument();
  });

  it('should apply correct border between map and chat', () => {
    render(
      <ChatProvider>
        <MapPageContent {...defaultProps} />
      </ChatProvider>
    );

    const chatPanel = screen.getByTestId('chat-panel');
    expect(chatPanel).toHaveClass('border-l');
  });
});