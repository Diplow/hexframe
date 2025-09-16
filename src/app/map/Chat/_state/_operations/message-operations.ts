import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';
import { 
  createUserMessageEvent, 
  createSystemMessageEvent,
  createAssistantMessageEvent
} from '~/app/map/Chat/_state/_events/event.creators';

/**
 * Message-related operations
 */
export function createMessageOperations(dispatch: (event: ChatEvent) => void) {
  return {
    sendMessage(text: string) {
      dispatch(createUserMessageEvent(text));
    },
    sendAssistantMessage(text: string) {
      dispatch(createAssistantMessageEvent(text));
    },
    showSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
      dispatch(createSystemMessageEvent(message, level));
    },
  };
}