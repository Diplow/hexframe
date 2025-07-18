export type { 
  ChatEvent, 
  ChatEventType, 
  ChatEventActor,
  Message,
  Widget,
  ChatUIState
} from './_events/event.types';

import type { ChatEvent } from './_events/event.types';

export type ChatCacheAction = 
  | { type: 'ADD_EVENT'; payload: ChatEvent }
  | { type: 'CLEAR_EVENTS' }
  | { type: 'REMOVE_EVENT'; payload: string };