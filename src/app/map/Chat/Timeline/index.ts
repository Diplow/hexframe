/**
 * Public API for Chat Timeline Subsystem
 * 
 * Consumers: ChatPanel component
 */

// Main Timeline Component
export { Messages as Timeline } from '~/app/map/Chat/Timeline/timeline';

/**
 * Chat Timeline Subsystem Public Interface
 * 
 * Handles unified display of messages and widgets in chronological order.
 * All widget rendering is handled internally - widgets are implementation
 * details, not public API.
 * 
 * Clean interface: only exports the timeline component itself.
 */