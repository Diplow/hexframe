import type { ChatEvent, Message, Widget } from '../types';
import type { UserMessagePayload, SystemMessagePayload, OperationCompletedPayload, TileSelectedPayload, OperationStartedPayload, ErrorOccurredPayload, AuthRequiredPayload } from '../_events/event.types';

export function deriveVisibleMessages(events: ChatEvent[]): Message[] {
  return events
    .filter(event => 
      event.type === 'user_message' || 
      event.type === 'system_message' || 
      event.type === 'operation_completed'
    )
    .map(event => {
      let content = '';
      const actor = event.actor;
      
      if (event.type === 'user_message') {
        const payload = event.payload as UserMessagePayload;
        content = payload.text || '';
      } else if (event.type === 'system_message') {
        const payload = event.payload as SystemMessagePayload;
        content = payload.message || '';
      } else if (event.type === 'operation_completed') {
        const payload = event.payload as OperationCompletedPayload;
        content = payload.message || '';
      }
      
      return {
        id: event.id,
        content,
        actor,
        timestamp: event.timestamp,
      };
    });
}

export function deriveActiveWidgets(events: ChatEvent[]): Widget[] {
  console.log('[deriveActiveWidgets] Processing', events.length, 'events')
  const widgets: Widget[] = [];
  const widgetStates = new Map<string, 'active' | 'completed'>();
  
  // Process events in order to track widget lifecycle
  for (const event of events) {
    switch (event.type) {
      case 'tile_selected': {
        const payload = event.payload as TileSelectedPayload;
        widgets.push({
          id: `widget-${event.id}`,
          type: 'preview',
          data: payload.tileData,
          priority: 'info',
          timestamp: event.timestamp,
        } as Widget & { tileData: typeof payload.tileData });
        break;
      }
      
      case 'operation_started': {
        const payload = event.payload as OperationStartedPayload;
        const widgetId = `op-${payload.operation}-${payload.tileId ?? 'global'}`;
        widgetStates.set(widgetId, 'active');
        
        const tileName = (payload.data as { tileName?: string })?.tileName;
        let message = '';
        if (payload.operation === 'delete' && tileName) {
          message = `Deleting "${tileName}"...`;
        } else {
          message = `${payload.operation}...`;
        }
        
        widgets.push({
          id: `widget-${event.id}`,
          type: 'loading',
          data: {
            operation: payload.operation,
            message,
            _widgetId: widgetId,
          },
          priority: 'action',
          timestamp: event.timestamp,
        } as Widget);
        break;
      }
      
      case 'operation_completed': {
        const payload = event.payload as OperationCompletedPayload;
        const widgetId = `op-${payload.operation}-${payload.tileId ?? 'global'}`;
        widgetStates.set(widgetId, 'completed');
        break;
      }
      
      case 'error_occurred': {
        const payload = event.payload as ErrorOccurredPayload;
        widgets.push({
          id: `widget-${event.id}`,
          type: 'error',
          data: {
            message: payload.error,
            retryAction: payload.context as { operation?: string; tileId?: string } | undefined,
          },
          priority: 'critical',
          timestamp: event.timestamp,
        } as Widget);
        break;
      }
      
      case 'widget_created': {
        const payload = event.payload as { widget: Widget };
        console.log('[deriveActiveWidgets] widget_created event found:', payload)
        if (payload.widget) {
          console.log('[deriveActiveWidgets] Adding widget:', payload.widget)
          widgets.push(payload.widget);
        }
        break;
      }
      
      case 'auth_required': {
        const payload = event.payload as AuthRequiredPayload;
        widgets.push({
          id: `widget-${event.id}`,
          type: 'login',
          data: {
            message: payload.reason,
            nextAction: payload.requiredFor,
          },
          priority: 'critical',
          timestamp: event.timestamp,
        } as Widget);
        break;
      }
      
      case 'navigation': {
        // Navigation closes tile preview widgets
        // Remove all preview widgets from before this navigation
        const navTime = event.timestamp;
        widgets.forEach((widget) => {
          if (widget.type === 'preview' && widget.timestamp < navTime) {
            (widget as Widget & { _removed?: boolean })._removed = true;
          }
        });
        break;
      }
    }
  }
  
  // Filter out completed operation widgets and removed widgets
  console.log('[deriveActiveWidgets] Total widgets before filtering:', widgets.length)
  const filteredWidgets = widgets
    .filter(widget => {
      const extWidget = widget as Widget & { _removed?: boolean; data?: { _widgetId?: string } };
      if (extWidget._removed) return false;
      if (extWidget.data && typeof extWidget.data === 'object' && '_widgetId' in extWidget.data) {
        return widgetStates.get(extWidget.data._widgetId!) !== 'completed';
      }
      return true;
    })
    .map(widget => {
      // Clean up internal properties
      const extWidget = widget as Widget & { _removed?: boolean };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _removed, ...cleanWidget } = extWidget;
      if (cleanWidget.data && typeof cleanWidget.data === 'object' && '_widgetId' in cleanWidget.data) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _widgetId, ...cleanData } = cleanWidget.data as { _widgetId?: string };
        return { ...cleanWidget, data: cleanData };
      }
      return cleanWidget;
    });
  
  console.log('[deriveActiveWidgets] Returning', filteredWidgets.length, 'active widgets')
  filteredWidgets.forEach(w => {
    console.log('[deriveActiveWidgets] Widget:', { id: w.id, type: w.type })
  })
  
  return filteredWidgets;
}