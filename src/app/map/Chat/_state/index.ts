// Re-export the public useChatState hook from ChatProvider
export { useChatState, ChatProvider } from '~/app/map/Chat/_state/ChatProvider';

// Also export as default for backward compatibility
export { useChatState as default } from '~/app/map/Chat/_state/ChatProvider';

// Re-export types for Timeline and other Chat subsystems
export type {
  ChatEvent,
  ChatEventType,
  ChatEventActor,
  Message,
  Widget,
  ChatUIState,
  ChatCacheAction,
  UserMessagePayload,
  SystemMessagePayload,
  TileSelectedPayload,
  NavigationPayload,
  OperationStartedPayload,
  OperationCompletedPayload,
  AuthRequiredPayload,
  ErrorOccurredPayload,
  ExecuteCommandPayload
} from './types';

// Re-export event types from _events to prevent hierarchical violations
export type {
  ChatEvent as EventType,
  ChatEventType as EventTypeEnum,
  ChatEventActor as EventActor
} from './_events/event.types';