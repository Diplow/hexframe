/**
 * Public API for Chat Subsystem
 * 
 * Consumers: Map page layout, external components needing chat functionality
 */

// Main Chat Component
export { ChatPanel } from './ChatPanel';

// State Management
export { ChatProvider, useChatState } from './_state';
export type { ChatUIState } from './_state/types';

// Event Types
export type { ChatEvent } from './_state/_events/event.types';

// Chat Types (for external consumption)
export type { 
  ChatMessage, 
  ChatWidget,
  PreviewWidgetData,
  CreationWidgetData,
  LoginWidgetData,
  ConfirmDeleteWidgetData,
  LoadingWidgetData,
  ErrorWidgetData,
  AIResponseWidgetData,
  ChatState,
  ChatAction,
  ChatContextValue
} from './types';

// Chat Settings
export { useChatSettings } from './_settings/useChatSettings';
export { chatSettings } from './_settings/chat-settings';

// AI Integration
export { useAIChatIntegration } from './_hooks/useAIChatIntegration';

/**
 * Chat Subsystem Public Interface
 * 
 * The Chat subsystem provides conversational interface to the map system.
 * It manages user input, displays system notifications, and handles complex
 * user interactions through widgets.
 * 
 * All components, hooks, types, and settings are exported above for direct usage.
 */