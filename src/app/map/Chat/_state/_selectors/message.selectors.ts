import type { ChatEvent, Message, Widget, OperationStartedPayload, OperationCompletedPayload, SystemMessagePayload, UserMessagePayload, TileSelectedPayload, AuthRequiredPayload, ErrorOccurredPayload, NavigationPayload } from '~/app/map/Chat/_state/_events/event.types';
import { chatSettings } from '~/app/map/Chat';

/**
 * Handle basic message events
 */
function _handleBasicMessageEvents(event: ChatEvent, messages: Message[]) {
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

    case 'message': {
      const payload = event.payload as { content?: string; text?: string; actor: string };
      const messageContent = payload.content ?? payload.text ?? '';
      messages.push({
        id: event.id,
        content: messageContent,
        actor: event.actor,
        timestamp: event.timestamp,
      });
      break;
    }
  }
}

/**
 * Handle operation completion events for messages
 */
function _handleOperationMessages(event: ChatEvent, messages: Message[], settings: any) {
  if (event.type === 'operation_completed') {
    const payload = event.payload as OperationCompletedPayload;
    if (payload.result === 'success') {
      const shouldShow = (
        (payload.operation === 'update' && settings.messages.tile.edit) ||
        (payload.operation === 'create' && settings.messages.tile.create) ||
        (payload.operation === 'delete' && settings.messages.tile.delete) ||
        (payload.operation === 'move' && settings.messages.tile.move) ||
        (payload.operation === 'swap' && settings.messages.tile.swap) ||
        (!['update', 'create', 'delete', 'move', 'swap'].includes(payload.operation))
      );
      
      if (shouldShow) {
        let content = payload.message;
        
        if (payload.tileId) {
          if (payload.operation === 'create') {
            const regex = /Created tile "(.+)"/;
            const match = regex.exec(payload.message);
            if (match?.[1]) {
              const tileName = match[1];
              const truncatedName = tileName.length > 25 ? tileName.slice(0, 25) + '...' : tileName;
              const navigationLink = `[**${truncatedName}**](command:navigate:${payload.tileId}:${encodeURIComponent(tileName)})`;
              content = `Created tile ${navigationLink}`;
            }
          } else if (payload.operation === 'delete') {
            const regex = /Deleted tile "(.+)"/;
            const match = regex.exec(payload.message);
            if (match?.[1]) {
              const tileName = match[1];
              const truncatedName = tileName.length > 25 ? tileName.slice(0, 25) + '...' : tileName;
              const navigationLink = `[**${truncatedName}**](command:navigate:${payload.tileId}:${encodeURIComponent(tileName)})`;
              content = `Deleted tile ${navigationLink}`;
            }
          } else if (payload.operation === 'move') {
            const regex = /Moved "(.+)"/;
            const match = regex.exec(payload.message);
            if (match?.[1]) {
              const tileName = match[1];
              const truncatedName = tileName.length > 25 ? tileName.slice(0, 25) + '...' : tileName;
              const navigationLink = `[**${truncatedName}**](command:navigate:${payload.tileId}:${encodeURIComponent(tileName)})`;
              content = `Moved ${navigationLink}`;
            }
          } else if (payload.operation === 'update') {
            const regex = /Updated tile "(.+)"/;
            const match = regex.exec(payload.message);
            if (match?.[1]) {
              const tileName = match[1];
              const truncatedName = tileName.length > 25 ? tileName.slice(0, 25) + '...' : tileName;
              const navigationLink = `[**${truncatedName}**](command:navigate:${payload.tileId}:${encodeURIComponent(tileName)})`;
              content = `Updated tile ${navigationLink}`;
            }
          }
        }
        
        if (payload.operation === 'swap') {
          const regex = /Swapped "(.+)" with "(.+)"/;
          const match = regex.exec(payload.message);
          if (match?.[1] && match?.[2]) {
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
  }
}

/**
 * Handle navigation events for messages
 */
function _handleNavigationMessages(event: ChatEvent, messages: Message[]) {
  if (event.type === 'navigation') {
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
  }
}

/**
 * Derive visible messages from events
 * Messages are derived from events that represent communication
 */
export function deriveVisibleMessages(events: ChatEvent[]): Message[] {
  const messages: Message[] = [];
  const settings = chatSettings.getSettings();

  for (const event of events) {
    // Try different message handlers
    _handleBasicMessageEvents(event, messages);
    _handleOperationMessages(event, messages, settings);
    _handleNavigationMessages(event, messages);
    
    // Handle debug messages if enabled (for events not handled by other handlers)
    if (settings.messages.debug && 
        !['user_message', 'system_message', 'message', 'operation_completed', 'navigation'].includes(event.type)) {
      messages.push({
        id: `debug-${event.id}`,
        content: `[DEBUG] Chat Event: **${event.type}** | Actor: ${event.actor} | Data: \`${JSON.stringify(event.payload)}\``,
        actor: 'system',
        timestamp: event.timestamp,
      });
    }
  }

  return messages;
}

/**
 * Handle operation completion events for widget states
 */
function _handleOperationCompleted(
  event: ChatEvent,
  widgetStates: Map<string, 'active' | 'completed'>,
  activeOperations: Set<string>
) {
  const payload = event.payload as OperationCompletedPayload;
  
  if (payload.tileId) {
    // Close preview widget for this tile if operation was delete
    if (payload.operation === 'delete') {
      const previewId = `preview-${payload.tileId}`;
      widgetStates.set(previewId, 'completed');
    }
  }
  
  // For delete operations, we need to find and close ALL delete widgets
  // since we can't reliably match by tileId in the operation ID
  if (payload.operation === 'delete') {
    // Find all delete widgets and mark them as completed
    for (const [widgetId, state] of widgetStates) {
      if (widgetId.startsWith('delete-') && state === 'active') {
        widgetStates.set(widgetId, 'completed');
      }
    }
  }
  
  // Original logic for other operations
  for (const opId of activeOperations) {
    if (opId.includes(payload.tileId ?? '')) {
      activeOperations.delete(opId);
      // Close creation widgets for create operations
      if (payload.operation === 'create') {
        const eventId = opId.replace('op-', '');
        const creationWidgetId = `creation-${eventId}`;
        widgetStates.set(creationWidgetId, 'completed');
      }
    }
  }
}

/**
 * Process events to determine widget states
 */
function _processWidgetStates(events: ChatEvent[]): {
  widgetStates: Map<string, 'active' | 'completed'>;
  activeOperations: Set<string>;
} {
  const activeOperations = new Set<string>();
  const widgetStates = new Map<string, 'active' | 'completed'>();
  const debugEnabled = chatSettings.getSettings().messages.debug === true;

  // Process events in order to determine widget states
  for (const event of events) {
    switch (event.type) {
      case 'tile_selected': {
        const payload = event.payload as TileSelectedPayload;
        const widgetId = `preview-${payload.tileId}`;
        widgetStates.set(widgetId, 'active');
        break;
      }

      case 'operation_started': {
        const payload = event.payload as OperationStartedPayload;
        const operationId = `op-${event.id}`;
        activeOperations.add(operationId);
        
        if (payload.operation === 'create') {
          const widgetId = `creation-${event.id}`;
          widgetStates.set(widgetId, 'active');
        }
        
        if (payload.operation === 'delete') {
          const widgetId = `delete-${event.id}`;
          widgetStates.set(widgetId, 'active');
        }
        break;
      }

      case 'operation_completed': {
        _handleOperationCompleted(event, widgetStates, activeOperations);
        break;
      }

      case 'auth_required': {
        widgetStates.set('login-widget', 'active');
        break;
      }

      case 'error_occurred': {
        const widgetId = `error-${event.id}`;
        widgetStates.set(widgetId, 'active');
        break;
      }

      case 'widget_created': {
        const payload = event.payload as { widget: Widget };
        if (debugEnabled) {
          console.log('[message.selectors.deriveActiveWidgets] widget_created event found:', payload);
        }
        if (payload.widget) {
          widgetStates.set(payload.widget.id, 'active');
          if (debugEnabled) {
            console.log('[message.selectors.deriveActiveWidgets] Widget state set to active:', payload.widget.id);
          }
        }
        break;
      }

      case 'widget_resolved': {
        const payload = event.payload as { widgetId: string; action: string };
        widgetStates.set(payload.widgetId, 'completed');
        break;
      }

      case 'widget_closed': {
        const payload = event.payload as { widgetId: string };
        widgetStates.set(payload.widgetId, 'completed');
        break;
      }
    }
  }

  return { widgetStates, activeOperations };
}

/**
 * Convert widget states to widget objects
 */
function _createWidgetsFromStates(events: ChatEvent[], widgetStates: Map<string, 'active' | 'completed'>): Widget[] {
  const widgets: Widget[] = [];
  const debugEnabled = chatSettings.getSettings().messages.debug === true;

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
            type: 'login' as const,
            data: payload,
            priority: 'critical' as const,
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
            widgets.push({
              id: widgetId,
              type: 'delete',
              data: payload.data,
              priority: 'action',
              timestamp: event.timestamp,
            });
          }
        }
        break;
      }
      case 'widget_created': {
        const payload = event.payload as { widget: Widget };
        if (payload.widget && widgetStates.get(payload.widget.id) === 'active') {
          if (debugEnabled) {
            console.log('[message.selectors.deriveActiveWidgets] Adding widget_created widget to array:', payload.widget);
          }
          // Add the widget directly - it's already fully formed
          widgets.push(payload.widget);
        }
        break;
      }
    }
  }

  return widgets;
}

/**
 * Derive active widgets from events
 * Widgets are derived from events that require user interaction
 */
export function deriveActiveWidgets(events: ChatEvent[]): Widget[] {
  const debugEnabled = chatSettings.getSettings().messages.debug === true;
  if (debugEnabled) {
    console.log('[message.selectors.deriveActiveWidgets] Processing', events.length, 'events');
  }

  // Process events to determine widget states
  const { widgetStates } = _processWidgetStates(events);
  
  // Convert active widget states to widget objects
  const widgets = _createWidgetsFromStates(events, widgetStates);

  // Return only the most recent widget of each type (except AI responses which should all persist)
  const latestWidgets = new Map<string, Widget>();
  
  for (const widget of widgets) {
    // Each AI response widget should be unique (keep all of them)
    const key = widget.type === 'ai-response' 
      ? widget.id  // Use widget ID to keep all AI responses
      : widget.type === 'preview' 
        ? `${widget.type}-${(widget.data as TileSelectedPayload).tileId}` 
        : widget.type;
    const existing = latestWidgets.get(key);
    if (!existing || widget.timestamp > existing.timestamp) {
      latestWidgets.set(key, widget);
    }
  }

  const result = Array.from(latestWidgets.values()).sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );
  
  if (debugEnabled) {
    console.log('[message.selectors.deriveActiveWidgets] Returning', result.length, 'widgets');
    result.forEach(w => {
      console.log('[message.selectors.deriveActiveWidgets] Widget:', { id: w.id, type: w.type });
    });
  }
  
  return result;
}

