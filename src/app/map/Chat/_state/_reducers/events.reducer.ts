import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';

/**
 * Events reducer - manages the event log
 * This is the source of truth for all chat state
 */
export function eventsReducer(events: ChatEvent[], newEvent: ChatEvent): ChatEvent[] {
  // Handle special events
  if (newEvent.type === 'clear_chat') {
    // Clear all events except the welcome message, then add logout message
    const welcomeEvent = events.find(e => e.id === 'welcome-message');
    const baseEvents = welcomeEvent ? [welcomeEvent] : [];
    
    // Add logout message after clearing
    const logoutMessage: ChatEvent = {
      id: `logout-message-${Date.now()}`,
      type: 'system_message',
      payload: {
        message: 'You have been logged out',
        level: 'info',
      },
      timestamp: new Date(),
      actor: 'system',
    };
    
    return [...baseEvents, logoutMessage];
  }
  
  // Simply append the new event to the log
  // This maintains immutability and preserves the full event history
  return [...events, newEvent];
  
  // Future enhancements could include:
  // - Event deduplication based on ID
  // - Event retention policies (e.g., max 1000 events)
  // - Event compression for similar consecutive events
}