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
  data: unknown; // Widget-specific data
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
  expandedPreviewId: string | null; // Track which preview is currently expanded
}

export type ChatAction =
  | { type: 'SELECT_TILE'; payload: { tileId: string; tileData: { id: string; title: string; content: string; } } }
  | { type: 'CLOSE_CHAT' }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'CENTER_CHANGED'; payload: { newCenter: string; title?: string } };

export interface ChatContextValue {
  state: ChatState;
  dispatch: (action: ChatAction) => void;
}