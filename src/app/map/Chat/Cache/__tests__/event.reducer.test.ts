import { describe, it, expect } from 'vitest';
import { eventsReducer } from '../_reducers/events.reducer';
import type { ChatEvent } from '../types';

describe('Events Reducer', () => {
  it('should append new event to empty array', () => {
    const initialState: ChatEvent[] = [];
    const newEvent: ChatEvent = {
      id: '1',
      type: 'user_message',
      payload: { text: 'Hello' },
      timestamp: new Date('2025-01-04T12:00:00Z'),
      actor: 'user',
    };

    const result = eventsReducer(initialState, newEvent);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(newEvent);
  });

  it('should preserve existing events when adding new one', () => {
    const existingEvent: ChatEvent = {
      id: '1',
      type: 'system_message',
      payload: { text: 'Welcome' },
      timestamp: new Date('2025-01-04T11:00:00Z'),
      actor: 'system',
    };
    const initialState = [existingEvent];
    const newEvent: ChatEvent = {
      id: '2',
      type: 'user_message',
      payload: { text: 'Hello' },
      timestamp: new Date('2025-01-04T12:00:00Z'),
      actor: 'user',
    };

    const result = eventsReducer(initialState, newEvent);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(existingEvent);
    expect(result[1]).toEqual(newEvent);
  });

  it('should clear all events except welcome message on clear_chat event', () => {
    const welcomeEvent: ChatEvent = {
      id: 'welcome-message',
      type: 'message',
      payload: { content: 'Welcome!', actor: 'system' },
      timestamp: new Date('2025-01-04T10:00:00Z'),
      actor: 'system',
    };
    const otherEvent: ChatEvent = {
      id: '2',
      type: 'user_message',
      payload: { text: 'Hello' },
      timestamp: new Date('2025-01-04T11:00:00Z'),
      actor: 'user',
    };
    const initialState = [welcomeEvent, otherEvent];
    
    const clearEvent: ChatEvent = {
      id: '3',
      type: 'clear_chat',
      payload: {},
      timestamp: new Date('2025-01-04T12:00:00Z'),
      actor: 'system',
    };

    const result = eventsReducer(initialState, clearEvent);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(welcomeEvent);
  });

  it('should clear all events when no welcome message exists', () => {
    const otherEvent: ChatEvent = {
      id: '1',
      type: 'user_message',
      payload: { text: 'Hello' },
      timestamp: new Date('2025-01-04T11:00:00Z'),
      actor: 'user',
    };
    const initialState = [otherEvent];
    
    const clearEvent: ChatEvent = {
      id: '2',
      type: 'clear_chat',
      payload: {},
      timestamp: new Date('2025-01-04T12:00:00Z'),
      actor: 'system',
    };

    const result = eventsReducer(initialState, clearEvent);

    expect(result).toHaveLength(0);
  });

  it('should handle regular events normally', () => {
    const initialState: ChatEvent[] = [];
    const mapEvent: ChatEvent = {
      id: '1',
      type: 'tile_selected',
      payload: { tileId: '123', tileName: 'New Tile' },
      timestamp: new Date('2025-01-04T12:00:00Z'),
      actor: 'system',
    };

    const result = eventsReducer(initialState, mapEvent);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mapEvent);
  });
});