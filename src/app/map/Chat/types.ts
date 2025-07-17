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
  type: 'preview' | 'search' | 'comparison' | 'action' | 'creation' | 'login' | 'confirm-delete' | 'loading' | 'error';
  data: unknown; // Widget-specific data
}

export interface PreviewWidgetData {
  tileId: string;
  title: string;
  content: string;
  openInEditMode?: boolean;
}

export interface CreationWidgetData {
  coordId: string;
  parentName?: string;
  parentId?: string;
  parentCoordId?: string;
}

export interface LoginWidgetData {
  message?: string;
}

export interface ConfirmDeleteWidgetData {
  tileId: string;
  tileName: string;
}

export interface LoadingWidgetData {
  message: string;
  operation?: 'create' | 'update' | 'delete' | 'move' | 'swap';
}

export interface ErrorWidgetData {
  message: string;
  error?: string;
  operation?: 'create' | 'update' | 'delete' | 'move' | 'swap';
  retry?: () => void;
}

export interface ChatState {
  selectedTileId: string | null;
  messages: ChatMessage[];
  isPanelOpen: boolean;
  expandedPreviewId: string | null; // Track which preview is currently expanded
}

export type ChatAction =
  | { type: 'SELECT_TILE'; payload: { tileId: string; tileData: { id: string; title: string; content: string; }; openInEditMode?: boolean } }
  | { type: 'CLOSE_CHAT' }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'CENTER_CHANGED'; payload: { newCenter: string; title?: string } }
  | { type: 'REMOVE_TILE_PREVIEW'; payload: { tileId: string } }
  | { type: 'CREATE_TILE'; payload: { coordId: string; parentName?: string; parentId?: string; parentCoordId?: string } }
  | { type: 'REMOVE_CREATION_WIDGET'; payload: { coordId: string } }
  | { type: 'TILE_CREATED'; payload: { tileName: string; parentName?: string; direction?: string } }
  | { type: 'TILE_UPDATED'; payload: { tileName: string } }
  | { type: 'TILE_RENAMED'; payload: { oldName: string; newName: string } }
  | { type: 'TILE_DELETED'; payload: { tileName: string } }
  | { type: 'TILES_SWAPPED'; payload: { tile1Name: string; tile2Name: string } }
  | { type: 'TILE_MOVED'; payload: { tileName: string; direction?: string; parentName?: string } }
  | { type: 'SHOW_LOGIN_WIDGET'; payload?: { message?: string } }
  | { type: 'REMOVE_LOGIN_WIDGET' }
  | { type: 'SHOW_DELETE_CONFIRMATION'; payload: { tileId: string; tileName: string } }
  | { type: 'REMOVE_DELETE_CONFIRMATION'; payload: { tileId: string } }
  | { type: 'SHOW_LOADING'; payload: { message: string; operation?: 'create' | 'update' | 'delete' | 'move' | 'swap' } }
  | { type: 'HIDE_LOADING' }
  | { type: 'SHOW_ERROR'; payload: { message: string; error?: string; operation?: 'create' | 'update' | 'delete' | 'move' | 'swap'; retry?: () => void } }
  | { type: 'HIDE_ERROR' };

export interface ChatContextValue {
  state: ChatState;
  dispatch: (action: ChatAction) => void;
}