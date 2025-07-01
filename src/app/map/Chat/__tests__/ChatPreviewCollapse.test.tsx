import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ChatProvider } from '../ChatProvider';
import { ChatPanel } from '../ChatPanel';
import { useTileSelectForChat } from '../../hooks/useTileSelectForChat';
import { useChat } from '../ChatProvider';
import type { ReactNode } from 'react';

// Component to test the chat behavior
function TestComponent({ onTileSelect }: { onTileSelect: (tileId: string, tileData: any) => void }) {
  const { state } = useChat();
  
  return (
    <div>
      <ChatPanel />
      <button onClick={() => onTileSelect('tile-1', { id: 'tile-1', title: 'Tile 1', content: 'Content 1' })}>
        Select Tile 1
      </button>
      <button onClick={() => onTileSelect('tile-2', { id: 'tile-2', title: 'Tile 2', content: 'Content 2' })}>
        Select Tile 2
      </button>
      <div data-testid="expanded-preview-id">{state.expandedPreviewId}</div>
    </div>
  );
}

function TestWrapper({ children }: { children: ReactNode }) {
  return <ChatProvider>{children}</ChatProvider>;
}

describe('Chat Preview Collapse Behavior', () => {
  it('should only have one expanded preview at a time', () => {
    let selectTile: (tileId: string, tileData: any) => void = () => {};
    
    const TestApp = () => {
      const { dispatch } = useChat();
      selectTile = (tileId: string, tileData: any) => {
        dispatch({ type: 'SELECT_TILE', payload: { tileId, tileData } });
      };
      
      return <TestComponent onTileSelect={selectTile} />;
    };
    
    render(
      <TestWrapper>
        <TestApp />
      </TestWrapper>
    );
    
    // Initially no preview is expanded
    expect(screen.getByTestId('expanded-preview-id')).toHaveTextContent('');
    
    // Select first tile
    const selectTile1Button = screen.getByText('Select Tile 1');
    act(() => {
      selectTile1Button.click();
    });
    
    // First preview should be expanded
    const expandedId1 = screen.getByTestId('expanded-preview-id').textContent;
    expect(expandedId1).toBeTruthy();
    expect(expandedId1).toContain('msg-');
    
    // Check that preview 1 is in the DOM
    const previews1 = screen.getAllByTestId('preview-widget');
    expect(previews1).toHaveLength(1);
    
    // Select second tile
    const selectTile2Button = screen.getByText('Select Tile 2');
    act(() => {
      selectTile2Button.click();
    });
    
    // Second preview should be expanded, first should be collapsed
    const expandedId2 = screen.getByTestId('expanded-preview-id').textContent;
    expect(expandedId2).toBeTruthy();
    expect(expandedId2).toContain('msg-');
    expect(expandedId2).not.toBe(expandedId1);
    
    // Check that we now have 2 previews
    const previews2 = screen.getAllByTestId('preview-widget');
    expect(previews2).toHaveLength(2);
  });
  
  it('should move existing preview to end when selecting same tile again', () => {
    let selectTile: (tileId: string, tileData: any) => void = () => {};
    
    const TestApp = () => {
      const { dispatch, state } = useChat();
      selectTile = (tileId: string, tileData: any) => {
        dispatch({ type: 'SELECT_TILE', payload: { tileId, tileData } });
      };
      
      return (
        <div>
          <TestComponent onTileSelect={selectTile} />
          <div data-testid="message-count">{state.messages.length}</div>
        </div>
      );
    };
    
    render(
      <TestWrapper>
        <TestApp />
      </TestWrapper>
    );
    
    // Select first tile
    const selectTile1Button = screen.getByText('Select Tile 1');
    act(() => {
      selectTile1Button.click();
    });
    
    expect(screen.getByTestId('message-count')).toHaveTextContent('1');
    
    // Select second tile
    const selectTile2Button = screen.getByText('Select Tile 2');
    act(() => {
      selectTile2Button.click();
    });
    
    expect(screen.getByTestId('message-count')).toHaveTextContent('2');
    
    // Select first tile again - should not create duplicate
    act(() => {
      selectTile1Button.click();
    });
    
    expect(screen.getByTestId('message-count')).toHaveTextContent('2');
  });
});