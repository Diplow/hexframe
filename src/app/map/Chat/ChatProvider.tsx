'use client';

import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { ChatState, ChatAction, ChatContextValue, ChatMessage, PreviewWidgetData } from './types';

const initialState: ChatState = {
  selectedTileId: null,
  messages: [],
  isPanelOpen: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SELECT_TILE': {
      const { tileId, tileData } = action.payload;
      
      // Check if we already have a preview for this tile
      const existingPreviewIndex = state.messages.findIndex(
        msg => msg.type === 'system' && 
        typeof msg.content === 'object' && 
        msg.content.type === 'preview' &&
        (msg.content.data as PreviewWidgetData).tileId === tileId
      );
      
      if (existingPreviewIndex !== -1) {
        // Move existing preview to the end
        const messages = [...state.messages];
        const [existingPreview] = messages.splice(existingPreviewIndex, 1);
        messages.push(existingPreview);
        
        return {
          ...state,
          selectedTileId: tileId,
          isPanelOpen: true,
          messages,
        };
      }
      
      // Create a new preview message if it doesn't exist
      const previewMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'system',
        content: {
          type: 'preview',
          data: {
            tileId,
            title: tileData.title || 'Untitled',
            content: tileData.content || '',
          } satisfies PreviewWidgetData,
        },
        metadata: {
          tileId,
          timestamp: new Date(),
        },
      };

      return {
        ...state,
        selectedTileId: tileId,
        isPanelOpen: true,
        messages: [...state.messages, previewMessage],
      };
    }

    case 'CLOSE_CHAT':
      return {
        ...state,
        isPanelOpen: false,
        selectedTileId: null,
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
      };

    default:
      return state;
  }
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const contextValue: ChatContextValue = {
    state,
    dispatch,
  };

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}