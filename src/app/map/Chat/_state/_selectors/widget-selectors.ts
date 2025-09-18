import type { ChatEvent, Widget, OperationStartedPayload, OperationCompletedPayload, TileSelectedPayload, AuthRequiredPayload, ErrorOccurredPayload } from '~/app/map/Chat/_state/_events/event.types';
import { chatSettings } from '~/app/map/Chat/_settings/chat-settings';

/**
 * Handle operation completion events for widget states
 */
function _handleOperationCompleted(
  event: ChatEvent,
  widgetStates: Map<string, 'active' | 'completed'>,
  activeOperations: Set<string>
) {
  const payload = event.payload as OperationCompletedPayload;
  if (!payload || typeof payload !== 'object' || !('operation' in payload)) {
    return;
  }

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

  // Prefer exact match by event id
  const opIdFromEvent = `op-${event.id}`;
  if (activeOperations.delete(opIdFromEvent)) {
    if (payload.operation === 'create') {
      widgetStates.set(`creation-${event.id}`, 'completed');
    }
  } else if (typeof payload.tileId === 'string' && payload.tileId.length > 0) {
    // Fallback: prune any ops that embed the tileId
    for (const opId of Array.from(activeOperations)) {
      if (opId.includes(payload.tileId)) {
        activeOperations.delete(opId);
        if (payload.operation === 'create') {
          widgetStates.set(`creation-${opId.replace('op-', '')}`, 'completed');
        }
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
        if (payload && typeof payload === 'object' && 'tileId' in payload && typeof payload.tileId === 'string') {
          const widgetId = `preview-${payload.tileId}`;
          widgetStates.set(widgetId, 'active');
        }
        break;
      }

      case 'operation_started': {
        const payload = event.payload as OperationStartedPayload;
        if (payload && typeof payload === 'object' && 'operation' in payload) {
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
        if (payload && typeof payload === 'object' && 'widget' in payload && payload.widget && typeof payload.widget === 'object' && 'id' in payload.widget) {
          widgetStates.set(payload.widget.id, 'active');
          if (debugEnabled) {
            console.log('[message.selectors.deriveActiveWidgets] Widget state set to active:', payload.widget.id);
          }
        }
        break;
      }

      case 'widget_resolved': {
        const payload = event.payload as { widgetId: string; action: string };
        if (payload && typeof payload === 'object' && 'widgetId' in payload && typeof payload.widgetId === 'string') {
          widgetStates.set(payload.widgetId, 'completed');
        }
        break;
      }

      case 'widget_closed': {
        const payload = event.payload as { widgetId: string };
        if (payload && typeof payload === 'object' && 'widgetId' in payload && typeof payload.widgetId === 'string') {
          widgetStates.set(payload.widgetId, 'completed');
        }
        break;
      }
    }
  }

  return { widgetStates, activeOperations };
}

/**
 * Create preview widget from tile selection event
 */
function _createPreviewWidget(event: ChatEvent, widgetStates: Map<string, 'active' | 'completed'>): Widget | null {
  const payload = event.payload as TileSelectedPayload;
  if (payload && typeof payload === 'object' && 'tileId' in payload && typeof payload.tileId === 'string') {
    const widgetId = `preview-${payload.tileId}`;
    if (widgetStates.get(widgetId) === 'active') {
      return {
        id: widgetId,
        type: 'preview',
        data: payload,
        priority: 'action',
        timestamp: event.timestamp,
      };
    }
  }
  return null;
}

/**
 * Create login widget from auth required event
 */
function _createLoginWidget(event: ChatEvent, widgetStates: Map<string, 'active' | 'completed'>): Widget | null {
  if (widgetStates.get('login-widget') === 'active') {
    const payload = event.payload as AuthRequiredPayload;
    if (payload && typeof payload === 'object') {
      return {
        id: 'login-widget',
        type: 'login' as const,
        data: payload,
        priority: 'critical' as const,
        timestamp: event.timestamp,
      };
    }
  }
  return null;
}

/**
 * Create error widget from error occurred event
 */
function _createErrorWidget(event: ChatEvent, widgetStates: Map<string, 'active' | 'completed'>): Widget | null {
  const widgetId = `error-${event.id}`;
  if (widgetStates.get(widgetId) === 'active') {
    const payload = event.payload as ErrorOccurredPayload;
    if (payload && typeof payload === 'object') {
      return {
        id: widgetId,
        type: 'error',
        data: payload,
        priority: 'critical',
        timestamp: event.timestamp,
      };
    }
  }
  return null;
}

/**
 * Create operation widgets from operation started event
 */
function _createOperationWidgets(event: ChatEvent, widgetStates: Map<string, 'active' | 'completed'>): Widget[] {
  const widgets: Widget[] = [];
  const payload = event.payload as OperationStartedPayload;
  
  if (payload && typeof payload === 'object' && 'operation' in payload) {
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
          data: {
            tileId: payload.tileId,
            tileName: (payload.data as { tileName?: string })?.tileName ?? 'item',
          },
          priority: 'action',
          timestamp: event.timestamp,
        });
      }
    }
  }
  
  return widgets;
}

/**
 * Create widget from widget created event
 */
function _createDirectWidget(event: ChatEvent, widgetStates: Map<string, 'active' | 'completed'>, debugEnabled: boolean): Widget | null {
  const payload = event.payload as { widget: Widget };
  if (payload && typeof payload === 'object' && 'widget' in payload && payload.widget && typeof payload.widget === 'object' && 'id' in payload.widget && widgetStates.get(payload.widget.id) === 'active') {
    if (debugEnabled) {
      console.log('[message.selectors.deriveActiveWidgets] Adding widget_created widget to array:', payload.widget);
    }
    return payload.widget;
  }
  return null;
}

/**
 * Convert widget states to widget objects using focused widget creators
 */
function _createWidgetsFromStates(events: ChatEvent[], widgetStates: Map<string, 'active' | 'completed'>): Widget[] {
  const widgets: Widget[] = [];
  const debugEnabled = chatSettings.getSettings().messages.debug === true;

  // Convert active widget states to widget objects using focused creators
  for (const event of events) {
    switch (event.type) {
      case 'tile_selected': {
        const widget = _createPreviewWidget(event, widgetStates);
        if (widget) widgets.push(widget);
        break;
      }

      case 'auth_required': {
        const widget = _createLoginWidget(event, widgetStates);
        if (widget) widgets.push(widget);
        break;
      }

      case 'error_occurred': {
        const widget = _createErrorWidget(event, widgetStates);
        if (widget) widgets.push(widget);
        break;
      }

      case 'operation_started': {
        const operationWidgets = _createOperationWidgets(event, widgetStates);
        widgets.push(...operationWidgets);
        break;
      }

      case 'widget_created': {
        const widget = _createDirectWidget(event, widgetStates, debugEnabled);
        if (widget) widgets.push(widget);
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