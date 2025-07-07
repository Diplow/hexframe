import type { ChatEvent, Message, Widget, OperationStartedPayload, OperationCompletedPayload, SystemMessagePayload, UserMessagePayload, TileSelectedPayload, AuthRequiredPayload, ErrorOccurredPayload, NavigationPayload } from '../_events/event.types';
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
            let content = payload.message;
            
            // Special formatting for operations with clickable tile names
            if (payload.tileId) {
              if (payload.operation === 'create') {
                // Extract tile name from message "Created tile "name""
                const regex = /Created tile "(.+)"/;
                const match = regex.exec(payload.message);
                if (match?.[1]) {
                  const tileName = match[1];
                  const truncatedName = tileName.length > 25 ? tileName.slice(0, 25) + '...' : tileName;
                  const navigationLink = `[**${truncatedName}**](command:navigate:${payload.tileId}:${encodeURIComponent(tileName)})`;
                  content = `Created tile ${navigationLink}`;
                }
              } else if (payload.operation === 'delete') {
                // Extract tile name from message "Deleted tile "name""
                const regex = /Deleted tile "(.+)"/;
                const match = regex.exec(payload.message);
                if (match?.[1]) {
                  const tileName = match[1];
                  const truncatedName = tileName.length > 25 ? tileName.slice(0, 25) + '...' : tileName;
                  const navigationLink = `[**${truncatedName}**](command:navigate:${payload.tileId}:${encodeURIComponent(tileName)})`;
                  content = `Deleted tile ${navigationLink}`;
                }
              } else if (payload.operation === 'move') {
                // Extract tile name from message "Moved "name""
                const regex = /Moved "(.+)"/;
                const match = regex.exec(payload.message);
                if (match?.[1]) {
                  const tileName = match[1];
                  const truncatedName = tileName.length > 25 ? tileName.slice(0, 25) + '...' : tileName;
                  const navigationLink = `[**${truncatedName}**](command:navigate:${payload.tileId}:${encodeURIComponent(tileName)})`;
                  content = `Moved ${navigationLink}`;
                }
              } else if (payload.operation === 'update') {
                // Extract tile name from message "Updated tile "name""
                const regex = /Updated tile "(.+)"/;
                const match = regex.exec(payload.message);
                if (match?.[1]) {
                  const tileName = match[1];
                  const truncatedName = tileName.length > 25 ? tileName.slice(0, 25) + '...' : tileName;
                  const navigationLink = `[**${truncatedName}**](command:navigate:${payload.tileId}:${encodeURIComponent(tileName)})`;
                  content = `Updated tile ${navigationLink}`;
                }
              }
              // Note: swap operations involve two tiles, handled separately below
            }
            
            // Special handling for swap operations (two tiles)
            if (payload.operation === 'swap') {
              // Extract both tile names from message 'Swapped "name1" with "name2"'
              const regex = /Swapped "(.+)" with "(.+)"/;
              const match = regex.exec(payload.message);
              if (match?.[1] && match?.[2]) {
                // For swap, we don't have specific tileIds for each, so just make the text bold
                const tile1Name = match[1];
                const tile2Name = match[2];
                const truncated1 = tile1Name.length > 25 ? tile1Name.slice(0, 25) + '...' : tile1Name;
                const truncated2 = tile2Name.length > 25 ? tile2Name.slice(0, 25) + '...' : tile2Name;
                content = `Swapped **${truncated1}** with **${truncated2}**`;
              }
            }
            
            messages.push({
              id: event.id,
              content,
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
        const truncatedTileName = payload.toTileName.length > 25 
          ? payload.toTileName.slice(0, 25) + '...' 
          : payload.toTileName;
        const navigationLink = `[${truncatedTileName}](command:navigate:${payload.toTileId}:${encodeURIComponent(payload.toTileName)})`;
        messages.push({
          id: event.id,
          content: `📍 Navigated ${fromText}to **${navigationLink}**`,
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
        const payload = event.payload as OperationStartedPayload;
        const operationId = `op-${event.id}`;
        activeOperations.add(operationId);
        
        // Add creation widget for create operations
        if (payload.operation === 'create') {
          const widgetId = `creation-${event.id}`;
          console.log('[Selectors] 🆕 Setting creation widget active:', widgetId);
          widgetStates.set(widgetId, 'active');
        }
        
        // Add delete widget for delete operations
        if (payload.operation === 'delete') {
          const widgetId = `delete-${event.id}`;
          console.log('[Selectors] 🗑️ Setting delete widget active:', widgetId, {
            eventId: event.id,
            tileId: payload.tileId,
            data: payload.data
          });
          widgetStates.set(widgetId, 'active');
        }
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
        // Mark operation as completed and close associated widgets
        for (const opId of activeOperations) {
          if (opId.includes(payload.tileId ?? '')) {
            activeOperations.delete(opId);
            // Close creation widgets for create operations
            if (payload.operation === 'create') {
              const eventId = opId.replace('op-', '');
              const creationWidgetId = `creation-${eventId}`;
              widgetStates.set(creationWidgetId, 'completed');
            }
            
            // Close delete widgets for delete operations
            if (payload.operation === 'delete') {
              const eventId = opId.replace('op-', '');
              const deleteWidgetId = `delete-${eventId}`;
              widgetStates.set(deleteWidgetId, 'completed');
            }
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
        // Add error widget
        const widgetId = `error-${event.id}`;
        widgetStates.set(widgetId, 'active');
        break;
      }

      case 'widget_resolved': {
        const payload = event.payload as { widgetId: string; action: string };
        // Mark widget as completed
        console.log('[Selectors] ✅ Widget resolved:', {
          widgetId: payload.widgetId,
          action: payload.action,
          previousState: widgetStates.get(payload.widgetId)
        });
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

      case 'operation_started': {
        const payload = event.payload as OperationStartedPayload;
        if (payload.operation === 'create') {
          const widgetId = `creation-${event.id}`;
          if (widgetStates.get(widgetId) === 'active') {
            widgets.push({
              id: widgetId,
              type: 'creation',
              data: payload.data,
              priority: 'action',
              timestamp: event.timestamp,
            });
          }
        }
        
        if (payload.operation === 'delete') {
          const widgetId = `delete-${event.id}`;
          if (widgetStates.get(widgetId) === 'active') {
            console.log('[Selectors] 📦 Adding delete widget to render:', {
              widgetId,
              eventId: event.id,
              data: payload.data
            });
            widgets.push({
              id: widgetId,
              type: 'delete',
              data: payload.data,
              priority: 'action',
              timestamp: event.timestamp,
            });
          } else {
            console.log('[Selectors] ⚠️ Delete widget not active:', widgetId, widgetStates.get(widgetId));
          }
        }
        break;
      }
    }
  }

  // Return only the most recent widget of each type
  const latestWidgets = new Map<string, Widget>();
  console.log('[Selectors] 📦 Total widgets before filtering:', widgets.length);
  
  for (const widget of widgets) {
    const key = widget.type === 'preview' ? `${widget.type}-${(widget.data as TileSelectedPayload).tileId}` : widget.type;
    const existing = latestWidgets.get(key);
    if (!existing || widget.timestamp > existing.timestamp) {
      latestWidgets.set(key, widget);
    }
  }

  const result = Array.from(latestWidgets.values()).sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );
  
  console.log('[Selectors] 🎯 Final active widgets:', result.map(w => ({
    id: w.id,
    type: w.type,
    timestamp: w.timestamp.toISOString()
  })));
  
  return result;
}