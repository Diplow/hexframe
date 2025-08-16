import { describe, it, expect } from 'vitest';
import { eventsReducer } from '../_state/_reducers/events.reducer';
import { deriveVisibleMessages } from '../_state/_selectors/message.selectors';
import type { ChatEvent } from '../_state/_events/event.types';

describe('Message Edit and Delete Functionality', () => {
  it('should handle message editing', () => {
    // Initial message event
    const initialEvents: ChatEvent[] = [
      {
        id: 'msg-1',
        type: 'user_message',
        payload: { text: 'Original message' },
        timestamp: new Date('2025-01-01T10:00:00'),
        actor: 'user'
      }
    ];

    // Start editing
    const editStartEvent: ChatEvent = {
      id: 'edit-start-1',
      type: 'message_edit_started',
      payload: { messageId: 'msg-1' },
      timestamp: new Date('2025-01-01T10:01:00'),
      actor: 'user'
    };

    let events = [...initialEvents];
    events = eventsReducer(events, editStartEvent);
    
    let messages = deriveVisibleMessages(events);
    expect(messages[0]?.isEditing).toBe(true);

    // Complete editing
    const editCompleteEvent: ChatEvent = {
      id: 'edit-complete-1',
      type: 'message_edited',
      payload: { messageId: 'msg-1', newContent: 'Edited message' },
      timestamp: new Date('2025-01-01T10:02:00'),
      actor: 'user'
    };

    events = eventsReducer(events, editCompleteEvent);
    messages = deriveVisibleMessages(events);
    
    expect(messages[0]?.isEditing).toBe(false);
    expect(messages[0]?.content).toBe('Edited message');
    expect(messages[0]?.originalContent).toBe('Original message');
  });

  it('should handle message deletion', () => {
    // Initial message events
    const initialEvents: ChatEvent[] = [
      {
        id: 'msg-1',
        type: 'user_message',
        payload: { text: 'First message' },
        timestamp: new Date('2025-01-01T10:00:00'),
        actor: 'user'
      },
      {
        id: 'msg-2',
        type: 'user_message',
        payload: { text: 'Second message' },
        timestamp: new Date('2025-01-01T10:01:00'),
        actor: 'user'
      }
    ];

    let events = [...initialEvents];
    let messages = deriveVisibleMessages(events);
    expect(messages).toHaveLength(2);

    // Delete the first message
    const deleteEvent: ChatEvent = {
      id: 'delete-1',
      type: 'message_deleted',
      payload: { messageId: 'msg-1' },
      timestamp: new Date('2025-01-01T10:02:00'),
      actor: 'user'
    };

    events = eventsReducer(events, deleteEvent);
    messages = deriveVisibleMessages(events);
    
    // Should only have one message left
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe('Second message');
  });
});