/**
 * Chat State Events - Public API
 *
 * This module provides event types, creators, and transformers for the chat system.
 */

// Event types
export type {
  ChatEventType,
  ChatEventActor,
  ChatEvent,
  ChatUIState,
  Message,
  Widget,
  UserMessagePayload,
  SystemMessagePayload,
  TileSelectedPayload,
  NavigationPayload,
  OperationStartedPayload,
  OperationCompletedPayload,
  AuthRequiredPayload,
  ErrorOccurredPayload,
  ExecuteCommandPayload,
  WidgetResolvedPayload,
  StreamingMessageStartPayload,
  StreamingMessageDeltaPayload,
  StreamingMessageEndPayload,
  ToolCallStartPayload,
  ToolCallEndPayload,
  ToolCallWidgetData,
} from '~/app/map/Chat/_state/_events/event.types';

// Event creators
export {
  createChatEventFromMapEvent,
  createUserMessageEvent,
  createSystemMessageEvent,
  createAssistantMessageEvent,
  createOperationStartedEvent,
  createStreamingMessageStartEvent,
  createStreamingMessageDeltaEvent,
  createStreamingMessageEndEvent,
  createToolCallStartEvent,
  createToolCallEndEvent,
} from '~/app/map/Chat/_state/_events/event.creators';

// Validators
export {
  validateAndTransformMapEvent,
} from '~/app/map/Chat/_state/_events/event.validators';
