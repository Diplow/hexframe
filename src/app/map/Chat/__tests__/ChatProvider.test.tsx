import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ChatProvider, useChat } from '../ChatProvider';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ChatProvider>{children}</ChatProvider>
);

describe('ChatProvider', () => {
  it('should initialize with empty message state', () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    
    expect(result.current.state.messages).toEqual([]);
    expect(result.current.state.selectedTileId).toBeNull();
    expect(result.current.state.isPanelOpen).toBe(false);
  });

  it('should handle SELECT_TILE action and add preview message', () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    
    const tileData = {
      title: 'Test Tile',
      content: 'Test content',
      id: 'tile-1'
    };

    act(() => {
      result.current.dispatch({ 
        type: 'SELECT_TILE', 
        payload: { tileId: 'tile-1', tileData } 
      });
    });

    expect(result.current.state.selectedTileId).toBe('tile-1');
    expect(result.current.state.isPanelOpen).toBe(true);
    expect(result.current.state.messages).toHaveLength(1);
    
    const message = result.current.state.messages[0]!;
    expect(message.type).toBe('system');
    expect(message.metadata?.tileId).toBe('tile-1');
    expect(message.content).toMatchObject({
      type: 'preview',
      data: expect.objectContaining({
        tileId: 'tile-1',
        title: 'Test Tile',
        content: 'Test content'
      })
    });
  });

  it('should handle CLOSE_CHAT action', () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    
    // First select a tile
    act(() => {
      result.current.dispatch({ 
        type: 'SELECT_TILE', 
        payload: { tileId: 'tile-1', tileData: { id: 'tile-1', title: 'Test', content: '' } } 
      });
    });

    // Then close chat
    act(() => {
      result.current.dispatch({ type: 'CLOSE_CHAT' });
    });

    expect(result.current.state.isPanelOpen).toBe(false);
    expect(result.current.state.selectedTileId).toBeNull();
    // Messages should persist
    expect(result.current.state.messages.length).toBeGreaterThan(0);
  });

  it('should maintain message history across tile selections', () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    
    // Select first tile
    act(() => {
      result.current.dispatch({ 
        type: 'SELECT_TILE', 
        payload: { tileId: 'tile-1', tileData: { id: 'tile-1', title: 'Tile 1', content: '' } } 
      });
    });

    // Select second tile
    act(() => {
      result.current.dispatch({ 
        type: 'SELECT_TILE', 
        payload: { tileId: 'tile-2', tileData: { id: 'tile-2', title: 'Tile 2', content: '' } } 
      });
    });

    expect(result.current.state.messages).toHaveLength(2);
    expect(result.current.state.messages[0]!.metadata?.tileId).toBe('tile-1');
    expect(result.current.state.messages[1]!.metadata?.tileId).toBe('tile-2');
  });

  it('should generate unique message IDs', () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    
    // Add multiple messages
    act(() => {
      result.current.dispatch({ 
        type: 'SELECT_TILE', 
        payload: { tileId: 'tile-1', tileData: { id: 'tile-1', title: 'Tile 1', content: '' } } 
      });
    });

    act(() => {
      result.current.dispatch({ 
        type: 'SELECT_TILE', 
        payload: { tileId: 'tile-2', tileData: { id: 'tile-2', title: 'Tile 2', content: '' } } 
      });
    });

    const messageIds = result.current.state.messages.map(m => m.id);
    const uniqueIds = new Set(messageIds);
    expect(uniqueIds.size).toBe(messageIds.length);
  });

  it('should clear messages on provider unmount (no persistence)', () => {
    const { result, unmount } = renderHook(() => useChat(), { wrapper });
    
    // Add a message
    act(() => {
      result.current.dispatch({ 
        type: 'SELECT_TILE', 
        payload: { tileId: 'tile-1', tileData: { id: 'tile-1', title: 'Test', content: '' } } 
      });
    });

    expect(result.current.state.messages).toHaveLength(1);

    // Unmount and remount
    unmount();
    const { result: newResult } = renderHook(() => useChat(), { wrapper });
    
    // Should have no messages after remount (no persistence)
    expect(newResult.current.state.messages).toHaveLength(0);
  });
});