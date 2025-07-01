export interface ChatMessage {
  id: string;
  type: 'system' | 'user' | 'assistant';
  content: string | ChatWidget;
  metadata?: {
    tileId?: string;
    timestamp: Date;
  };
}

export interface ChatWidget {
  type: 'preview' | 'search' | 'comparison' | 'action';
  data: any; // Widget-specific data
}

export interface PreviewWidgetData {
  tileId: string;
  title: string;
  content: string;
}

export interface ChatState {
  selectedTileId: string | null;
  messages: ChatMessage[];
  isPanelOpen: boolean;
}

export type ChatAction =
  | { type: 'SELECT_TILE'; payload: { tileId: string; tileData: any } }
  | { type: 'CLOSE_CHAT' }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_MESSAGES' };

export interface ChatContextValue {
  state: ChatState;
  dispatch: (action: ChatAction) => void;
}