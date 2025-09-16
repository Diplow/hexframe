export type { 
  ChatEvent, 
  ChatEventType, 
  ChatEventActor,
  Message,
  Widget,
  ChatUIState,
  UserMessagePayload,
  SystemMessagePayload,
  TileSelectedPayload,
  NavigationPayload,
  OperationStartedPayload,
  OperationCompletedPayload,
  AuthRequiredPayload,
  ErrorOccurredPayload,
  ExecuteCommandPayload
} from '~/app/map/Chat/_state/_events/event.types';

import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';

export type ChatCacheAction = 
  | { type: 'ADD_EVENT'; payload: ChatEvent }
  | { type: 'CLEAR_EVENTS' }
  | { type: 'REMOVE_EVENT'; payload: string };