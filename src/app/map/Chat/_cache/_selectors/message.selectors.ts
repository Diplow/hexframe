import type { ChatEvent, Message, Widget, OperationCompletedPayload, SystemMessagePayload, UserMessagePayload, TileSelectedPayload, AuthRequiredPayload, ErrorOccurredPayload, NavigationPayload } from '../_events/event.types';
import { chatSettings } from '../../_settings/chat-settings';

/**
 * Derive visible messages from events
 * Messages are derived from events that represent communication
 */
export function deriveVisibleMessages(events: ChatEvent[]): Message[] {
  const messages: Message[] = [];
  const settings = chatSettings.getSettings();

  for (const event of events) {
    switch (event.type) {
      case 'user_message': {
        const payload = event.payload as UserMessagePayload;
        messages.push({
          id: event.id,
          content: payload.text,
          actor: event.actor,
          timestamp: event.timestamp,
        });
        break;
      }

      case 'system_message': {
        const payload = event.payload as SystemMessagePayload;
        messages.push({
          id: event.id,
          content: payload.message,
          actor: event.actor,
          timestamp: event.timestamp,
        });
        break;
      }

      case 'operation_completed': {
        const payload = event.payload as OperationCompletedPayload;
        if (payload.result === 'success') {
          // Check settings to see if we should show this operation
          const shouldShow = (
            (payload.operation === 'update' && settings.messages.tile.edit) ||
            (payload.operation === 'create' && settings.messages.tile.create) ||
            (payload.operation === 'delete' && settings.messages.tile.delete) ||
            (payload.operation === 'move' && settings.messages.tile.move) ||
            (payload.operation === 'swap' && settings.messages.tile.swap) ||
            (!['update', 'create', 'delete', 'move', 'swap'].includes(payload.operation)) // Show other operations
          );
          
          if (shouldShow) {
            messages.push({
              id: event.id,
              content: payload.message,
              actor: 'system',
              timestamp: event.timestamp,
            });
          }
        }
        break;
      }

      case 'message': {
        const payload = event.payload as { content: string; actor: string };
        messages.push({
          id: event.id,
          content: payload.content,
          actor: event.actor,
          timestamp: event.timestamp,
        });
        break;
      }

      case 'navigation': {
        const payload = event.payload as NavigationPayload;
        const fromText = payload.fromTileName ? `from "${payload.fromTileName}" ` : '';
        messages.push({
          id: event.id,
          content: `📍 Navigated ${fromText}to **${payload.toTileName}**`,
          actor: 'system',
          timestamp: event.timestamp,
        });
        break;
      }


      // Other event types don't produce messages
      default: {
        // Show debug messages for chat events if debug is enabled
        if (settings.messages.debug) {
          messages.push({
            id: `debug-${event.id}`,
            content: `[DEBUG] Chat Event: **${event.type}** | Actor: ${event.actor} | Data: \`${JSON.stringify(event.payload)}\``,
            actor: 'system',
            timestamp: event.timestamp,
          });
        }
      }
    }
  }

  return messages;
}

/**
 * Derive active widgets from events
 * Widgets are derived from events that require user interaction
 */
export function deriveActiveWidgets(events: ChatEvent[]): Widget[] {
  const widgets: Widget[] = [];
  const activeOperations = new Set<string>();
  const widgetStates = new Map<string, 'active' | 'completed'>();

  // Process events in order to determine widget states
  for (const event of events) {
    switch (event.type) {
      case 'tile_selected': {
        const payload = event.payload as TileSelectedPayload;
        // Add preview widget
        const widgetId = `preview-${payload.tileId}`;
        widgetStates.set(widgetId, 'active');
        break;
      }

      case 'operation_started': {
        const operationId = `op-${event.id}`;
        activeOperations.add(operationId);
        break;
      }

      case 'operation_completed': {
        // Remove any active operation widgets for this tile
        const payload = event.payload as OperationCompletedPayload;
        if (payload.tileId) {
          // Close preview widget for this tile if operation was delete
          if (payload.operation === 'delete') {
            const previewId = `preview-${payload.tileId}`;
            widgetStates.set(previewId, 'completed');
          }
        }
        // Mark operation as completed
        for (const opId of activeOperations) {
          if (opId.includes(payload.tileId ?? '')) {
            activeOperations.delete(opId);
          }
        }
        break;
      }

      case 'auth_required': {
        // Add login widget
        widgetStates.set('login-widget', 'active');
        break;
      }

      case 'error_occurred': {
        const payload = event.payload as ErrorOccurredPayload;
        // Add error widget
        const widgetId = `error-${event.id}`;
        widgetStates.set(widgetId, 'active');
        break;
      }

      case 'widget_resolved': {
        const payload = event.payload as { widgetId: string; action: string };
        // Mark widget as completed
        widgetStates.set(payload.widgetId, 'completed');
        break;
      }
    }
  }

  // Convert active widget states to widget objects
  for (const event of events) {
    switch (event.type) {
      case 'tile_selected': {
        const payload = event.payload as TileSelectedPayload;
        const widgetId = `preview-${payload.tileId}`;
        if (widgetStates.get(widgetId) === 'active') {
          widgets.push({
            id: widgetId,
            type: 'preview',
            data: payload,
            priority: 'action',
            timestamp: event.timestamp,
          });
        }
        break;
      }

      case 'auth_required': {
        if (widgetStates.get('login-widget') === 'active') {
          const payload = event.payload as AuthRequiredPayload;
          widgets.push({
            id: 'login-widget',
            type: 'login',
            data: payload,
            priority: 'critical',
            timestamp: event.timestamp,
          });
        }
        break;
      }

      case 'error_occurred': {
        const widgetId = `error-${event.id}`;
        if (widgetStates.get(widgetId) === 'active') {
          const payload = event.payload as ErrorOccurredPayload;
          widgets.push({
            id: widgetId,
            type: 'error',
            data: payload,
            priority: 'critical',
            timestamp: event.timestamp,
          });
        }
        break;
      }
    }
  }

  // Return only the most recent widget of each type
  const latestWidgets = new Map<string, Widget>();
  for (const widget of widgets) {
    const key = widget.type === 'preview' ? `${widget.type}-${(widget.data as TileSelectedPayload).tileId}` : widget.type;
    const existing = latestWidgets.get(key);
    if (!existing || widget.timestamp > existing.timestamp) {
      latestWidgets.set(key, widget);
    }
  }

  return Array.from(latestWidgets.values()).sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );
}