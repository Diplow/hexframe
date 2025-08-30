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
} from './_state';

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
export { useChatSettings } from '~/app/map/Chat/_settings/useChatSettings';
export { chatSettings } from '~/app/map/Chat/_settings/chat-settings';

// AI Integration
export { useAIChatIntegration } from '~/app/map/Chat/_hooks/useAIChatIntegration';

// Cache reexports for Timeline and other Chat subsystems
export { 
  MapCacheProvider, 
  MapCacheContext, 
  useMapCache 
} from '../Cache';
export type { 
  MapCacheHook, 
  CacheState,
  TileData as CacheTileData
} from '../Cache';

// Services reexports for Timeline and other Chat subsystems
export {
  EventBus,
  EventBusProvider,
  EventBusContext,
  useEventBus,
  preloadUserMapData,
  transformApiItemsToTileData,
  savePreFetchedData,
  loadPreFetchedData,
  clearPreFetchedData
} from '../Services';
export type {
  AppEvent,
  EventListener,
  EventBusService,
  PreFetchedMapData
} from '../Services';

/**
 * Chat Subsystem Public Interface
 * 
 * The Chat subsystem provides conversational interface to the map system.
 * It manages user input, displays system notifications, and handles complex
 * user interactions through widgets.
 * 
 * All components, hooks, types, and settings are exported above for direct usage.
 */