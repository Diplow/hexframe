/**
 * Public API for Chat Subsystem
 * 
 * Consumers: Map page layout, external components needing chat functionality
 */

// Main Chat Component
export { ChatPanel } from '~/app/map/Chat/ChatPanel';

// State Management
export { ChatProvider, useChatState } from '~/app/map/Chat/_state';
export type { 
  ChatUIState,
  ChatEvent,
  ChatEventType,
  ChatEventActor,
  Message,
  Widget,
  ChatCacheAction
} from '~/app/map/Chat/_state';

// Chat Types (for external consumption)
export type {
  ChatMessage,
  ChatWidget,
  TileWidgetData,
  CreationWidgetData,
  LoginWidgetData,
  ConfirmDeleteWidgetData,
  LoadingWidgetData,
  ErrorWidgetData,
  AIResponseWidgetData,
  ChatState,
  ChatAction,
  ChatContextValue
} from '~/app/map/Chat/types';

// Chat Settings
export { useChatSettings } from '~/app/map/Chat/_settings/useChatSettings';
export { chatSettings } from '~/app/map/Chat/_settings/chat-settings';

// AI Integration
export { useAIChatIntegration } from '~/app/map/Chat/_hooks/useAIChatIntegration';

// NOTE: Cache and Services reexports removed to fix architecture violations.
// Components should import directly from ../Cache and ../Services as needed.

/**
 * Chat Subsystem Public Interface
 * 
 * The Chat subsystem provides conversational interface to the map system.
 * It manages user input, displays system notifications, and handles complex
 * user interactions through widgets.
 * 
 * All components, hooks, types, and settings are exported above for direct usage.
 */