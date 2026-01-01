/**
 * Chat event types for event-driven architecture
 */

export type ChatEventType =
  | 'user_message'
  | 'system_message'
  | 'tile_selected'
  | 'navigation'
  | 'operation_started'
  | 'operation_completed'
  | 'auth_required'
  | 'error_occurred'
  | 'clear_chat'
  | 'message'
  | 'widget_resolved'
  | 'widget_created'
  | 'widget_closed'
  | 'widget_updated'
  | 'execute_command'
  // Streaming events
  | 'streaming_message_start'
  | 'streaming_message_delta'
  | 'streaming_message_end'
  | 'tool_call_start'
  | 'tool_call_end';

export type ChatEventActor = 'user' | 'system' | 'assistant';

export interface ChatEvent {
  id: string;
  type: ChatEventType;
  payload: unknown;
  timestamp: Date;
  actor: ChatEventActor;
}

export interface ChatUIState {
  events: ChatEvent[];
  activeWidgets: Widget[];
  visibleMessages: Message[];
}

export interface Message {
  id: string;
  content: string;
  actor: ChatEventActor;
  timestamp: Date;
}

export interface Widget {
  id: string;
  type: 'tile' | 'creation' | 'delete' | 'delete_children' | 'login' | 'loading' | 'error' | 'ai-response' | 'mcp-keys' | 'debug-logs' | 'favorites' | 'tool-call';
  data: unknown;
  priority: 'info' | 'action' | 'critical';
  timestamp: Date;
}

// Event payload types
export interface UserMessagePayload {
  text: string;
}

export interface SystemMessagePayload {
  message: string;
  level?: 'info' | 'warning' | 'error';
}

export interface TileSelectedPayload {
  tileId: string;
  tileData: {
    title: string;
    description?: string;
    content?: string;
    coordId: string;
  };
  openInEditMode?: boolean;
}

export interface NavigationPayload {
  fromTileId?: string;
  toTileId: string;
  fromTileName?: string;
  toTileName: string;
}

export interface OperationStartedPayload {
  operation: 'create' | 'update' | 'delete' | 'move' | 'swap' | 'copy';
  tileId?: string;
  data?: unknown;
}

export interface OperationCompletedPayload {
  operation: 'create' | 'update' | 'delete' | 'move' | 'swap' | 'copy';
  tileId?: string;
  result: 'success' | 'failure';
  message: string;
}

export interface AuthRequiredPayload {
  reason: string;
  requiredFor?: string;
}

export interface ErrorOccurredPayload {
  error: string;
  context?: unknown;
  retryable?: boolean;
}

export interface ExecuteCommandPayload {
  command: string;
}

// Streaming event payload types
export interface StreamingMessageStartPayload {
  streamId: string;
  model?: string;
}

export interface StreamingMessageDeltaPayload {
  streamId: string;
  delta: string;
}

export interface StreamingMessageEndPayload {
  streamId: string;
  finalContent: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface ToolCallStartPayload {
  streamId: string;
  toolCallId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallEndPayload {
  streamId: string;
  toolCallId: string;
  result: string;
  success: boolean;
}

// Tool call widget data types
export interface ToolCallWidgetData {
  toolCallId: string;
  streamId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  status: 'running' | 'completed' | 'failed';
  result?: string;
}