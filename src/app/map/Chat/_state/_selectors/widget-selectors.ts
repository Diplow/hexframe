import type { ChatEvent, Widget, OperationStartedPayload, OperationCompletedPayload, TileSelectedPayload, AuthRequiredPayload, ErrorOccurredPayload } from '~/app/map/Chat/_state/_events/event.types';
import { chatSettings } from '~/app/map/Chat/_settings/chat-settings';

/**
 * PERFORMANCE OPTIMIZATION:
 *
 * Indexed widget tracking prevents O(n²) performance degradation during concurrent operations.
 *
 * Previous approach: Iterated ALL widgets on every operation completion to find matching prefixes
 * - With N widgets and M operations: O(N × M) worst case
 * - Example: 50 widgets × 10 concurrent ops = 500 iterations per completion
 *
 * Current approach: Maintain separate indices for widget types that need bulk operations
 * - loadingWidgets: Set of all active loading widgets (O(1) add, O(k) close where k = # loading widgets)
 * - deleteWidgets: Set of all active delete widgets (O(1) add, O(k) close where k = # delete widgets)
 *
 * Performance gain: O(N × M) → O(N + k) where k << N (only specific widget types, not all widgets)
 *
 * @see useChatStateInternal - Uses useMemo to prevent recalculation when events unchanged
 */
interface WidgetStateIndex {
  states: Map<string, 'active' | 'completed'>;
  loadingWidgets: Set<string>;
  deleteWidgets: Set<string>;
}

/**
 * Add widget to indexed state
 */
function _addToIndex(index: WidgetStateIndex, widgetId: string, state: 'active' | 'completed') {
  index.states.set(widgetId, state);

  if (state === 'active') {
    if (widgetId.startsWith('loading-')) {
      index.loadingWidgets.add(widgetId);
    } else if (widgetId.startsWith('delete-')) {
      index.deleteWidgets.add(widgetId);
    }
  } else {
    // Remove from indices when marked completed
    index.loadingWidgets.delete(widgetId);
    index.deleteWidgets.delete(widgetId);
  }
}

/**
 * Handle operation completion events for widget states
 */
function _handleOperationCompleted(
  event: ChatEvent,
  index: WidgetStateIndex,
  activeOperations: Set<string>
) {
  const payload = event.payload as OperationCompletedPayload;
  if (!payload || typeof payload !== 'object' || !('operation' in payload)) {
    return;
  }

  if (payload.tileId) {
    // Close tile widget for this tile if operation was delete
    if (payload.operation === 'delete') {
      const tileWidgetId = `tile-${payload.tileId}`;
      _addToIndex(index, tileWidgetId, 'completed');
    }
  }

  // For delete operations, close ALL delete widgets - O(n) but only for delete widgets
  if (payload.operation === 'delete') {
    for (const widgetId of index.deleteWidgets) {
      _addToIndex(index, widgetId, 'completed');
    }
  }

  // Close ALL loading widgets - O(n) but only for loading widgets
  for (const widgetId of index.loadingWidgets) {
    _addToIndex(index, widgetId, 'completed');
  }

  // Prefer exact match by event id
  const opIdFromEvent = `op-${event.id}`;
  if (activeOperations.delete(opIdFromEvent)) {
    if (payload.operation === 'create') {
      _addToIndex(index, `creation-${event.id}`, 'completed');
    }
  } else if (typeof payload.tileId === 'string' && payload.tileId.length > 0) {
    // Fallback: prune any ops that embed the tileId
    for (const opId of Array.from(activeOperations)) {
      if (opId.includes(payload.tileId)) {
        activeOperations.delete(opId);
        if (payload.operation === 'create') {
          _addToIndex(index, `creation-${opId.replace('op-', '')}`, 'completed');
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
  const index: WidgetStateIndex = {
    states: new Map<string, 'active' | 'completed'>(),
    loadingWidgets: new Set<string>(),
    deleteWidgets: new Set<string>(),
  };

  // Process events in order to determine widget states
  for (const event of events) {
    switch (event.type) {
      case 'tile_selected': {
        const payload = event.payload as TileSelectedPayload;
        if (payload && typeof payload === 'object' && 'tileId' in payload && typeof payload.tileId === 'string') {
          const widgetId = `tile-${payload.tileId}`;
          _addToIndex(index, widgetId, 'active');
        }
        break;
      }

      case 'operation_started': {
        const payload = event.payload as OperationStartedPayload;
        if (payload && typeof payload === 'object' && 'operation' in payload) {
          const operationId = `op-${event.id}`;
          activeOperations.add(operationId);

          // Create loading widget for all operations
          const loadingWidgetId = `loading-${event.id}`;
          _addToIndex(index, loadingWidgetId, 'active');

          // Note: We don't create new creation/delete widgets here
          // Those widgets are already created by map.create_requested/map.delete_requested events
          // operation_started is just for tracking the operation and showing loading state
        }
        break;
      }

      case 'operation_completed': {
        _handleOperationCompleted(event, index, activeOperations);
        break;
      }

      case 'auth_required': {
        _addToIndex(index, 'login-widget', 'active');
        break;
      }

      case 'error_occurred': {
        const widgetId = `error-${event.id}`;
        _addToIndex(index, widgetId, 'active');
        break;
      }

      case 'widget_created': {
        const payload = event.payload as { widget: Widget };
        if (payload && typeof payload === 'object' && 'widget' in payload && payload.widget && typeof payload.widget === 'object' && 'id' in payload.widget) {
          _addToIndex(index, payload.widget.id, 'active');
        }
        break;
      }

      case 'widget_resolved': {
        const payload = event.payload as { widgetId: string; action: string };
        if (payload && typeof payload === 'object' && 'widgetId' in payload && typeof payload.widgetId === 'string') {
          _addToIndex(index, payload.widgetId, 'completed');
        }
        break;
      }

      case 'widget_closed': {
        const payload = event.payload as { widgetId: string };
        if (payload && typeof payload === 'object' && 'widgetId' in payload && typeof payload.widgetId === 'string') {
          _addToIndex(index, payload.widgetId, 'completed');
        }
        break;
      }
    }
  }

  return { widgetStates: index.states, activeOperations };
}

/**
 * Track widget updates for applying to final widget data
 */
interface WidgetUpdates {
  updates: Map<string, Record<string, unknown>>;
}

/**
 * Process widget_updated events to collect updates
 */
function _processWidgetUpdates(events: ChatEvent[]): WidgetUpdates {
  const updates = new Map<string, Record<string, unknown>>();

  for (const event of events) {
    if (event.type === 'widget_updated') {
      const payload = event.payload as { widgetId: string; updates: Record<string, unknown> };
      if (payload && typeof payload === 'object' && 'widgetId' in payload && 'updates' in payload) {
        // Merge updates for the same widget
        const existingUpdates = updates.get(payload.widgetId) ?? {};
        updates.set(payload.widgetId, { ...existingUpdates, ...payload.updates });
      }
    }
  }

  return { updates };
}

/**
 * Apply updates to widget data
 */
function _applyWidgetUpdates(widgets: Widget[], widgetUpdates: WidgetUpdates): Widget[] {
  return widgets.map(widget => {
    const updates = widgetUpdates.updates.get(widget.id);
    if (updates) {
      return {
        ...widget,
        data: {
          ...(widget.data as Record<string, unknown>),
          ...updates,
        },
      };
    }
    return widget;
  });
}

/**
 * Create tile widget from tile selection event
 */
function _createTileWidget(event: ChatEvent, widgetStates: Map<string, 'active' | 'completed'>): Widget | null {
  const payload = event.payload as TileSelectedPayload;
  if (payload && typeof payload === 'object' && 'tileId' in payload && typeof payload.tileId === 'string') {
    const widgetId = `tile-${payload.tileId}`;
    if (widgetStates.get(widgetId) === 'active') {
      return {
        id: widgetId,
        type: 'tile',
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
  const widgetState = widgetStates.get('login-widget');

  if (widgetState === 'active') {
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
 * Get loading message for an operation
 */
function _getLoadingMessage(operation: 'create' | 'update' | 'delete' | 'move' | 'swap' | 'copy', tileName?: string): string {
  const name = tileName ? ` "${tileName}"` : '';
  switch (operation) {
    case 'create':
      return `Creating${name}...`;
    case 'update':
      return `Updating${name}...`;
    case 'delete':
      return `Deleting${name}...`;
    case 'move':
      return `Moving${name}...`;
    case 'swap':
      return `Swapping${name}...`;
    case 'copy':
      return `Copying${name}...`;
  }
}

/**
 * Create operation widgets from operation started event
 */
function _createOperationWidgets(event: ChatEvent, widgetStates: Map<string, 'active' | 'completed'>): Widget[] {
  const widgets: Widget[] = [];
  const payload = event.payload as OperationStartedPayload;

  if (payload && typeof payload === 'object' && 'operation' in payload) {
    // Create loading widget for all operations
    const loadingWidgetId = `loading-${event.id}`;
    const widgetState = widgetStates.get(loadingWidgetId);
    if (widgetState === 'active') {
      const tileName = (payload.data as { tileName?: string })?.tileName;
      const loadingWidget: Widget = {
        id: loadingWidgetId,
        type: 'loading' as const,
        data: {
          message: _getLoadingMessage(payload.operation, tileName),
          operation: payload.operation,
        },
        priority: 'info' as const,
        timestamp: event.timestamp,
      };
      widgets.push(loadingWidget);
    }

    // Note: We don't create creation/delete widgets here
    // Those are created by map.create_requested/map.delete_requested events
    // operation_started only creates loading widgets
  }

  return widgets;
}

/**
 * Create widget from widget created event
 */
function _createDirectWidget(event: ChatEvent, widgetStates: Map<string, 'active' | 'completed'>, _debugEnabled: boolean): Widget | null {
  const payload = event.payload as { widget: Widget };
  if (payload && typeof payload === 'object' && 'widget' in payload && payload.widget && typeof payload.widget === 'object' && 'id' in payload.widget && widgetStates.get(payload.widget.id) === 'active') {
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
        const widget = _createTileWidget(event, widgetStates);
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
  // Process events to determine widget states
  const { widgetStates } = _processWidgetStates(events);

  // Process widget_updated events
  const widgetUpdates = _processWidgetUpdates(events);

  // Convert active widget states to widget objects
  let widgets = _createWidgetsFromStates(events, widgetStates);

  // Apply updates to widgets
  widgets = _applyWidgetUpdates(widgets, widgetUpdates);

  // Return only the most recent widget of each type (except AI responses and tool-call which should all persist)
  const latestWidgets = new Map<string, Widget>();

  for (const widget of widgets) {
    // Each AI response and tool-call widget should be unique (keep all of them)
    const key = widget.type === 'ai-response' || widget.type === 'tool-call'
      ? widget.id  // Use widget ID to keep all of these
      : widget.type === 'tile'
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

  return result;
}