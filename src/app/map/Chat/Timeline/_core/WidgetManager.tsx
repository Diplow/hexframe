import type { Widget } from '~/app/map/Chat/_state';
import type { TileData } from '~/app/map/types';
import type { ReactNode } from 'react';
import { useMapCache } from '~/app/map/Cache';
import { useEventBus } from '~/app/map/Services';
import { useChatState } from '~/app/map/Chat/_state';
import { createCreationHandlers } from '~/app/map/Chat/Timeline/_utils/creation-handlers';
import { createPreviewHandlers } from '~/app/map/Chat/Timeline/_utils/preview-handlers';
import { focusChatInput } from '~/app/map/Chat/Timeline/_utils/focus-helpers';
import { 
  renderPreviewWidget,
  renderLoginWidget,
  renderErrorWidget,
  renderCreationWidget,
  renderLoadingWidget,
  renderDeleteWidget,
  renderAIResponseWidget,
  renderMcpKeysWidget,
  renderDebugLogsWidget,
  type WidgetHandlers
} from '~/app/map/Chat/Timeline/_components/_renderers/widget-renderers';

interface WidgetManagerProps {
  widgets: Widget[];
  focusChatInput?: () => void;
}

export function WidgetManager({ widgets, focusChatInput: focusChatInputProp }: WidgetManagerProps) {
  
  const { createItemOptimistic, updateItemOptimistic, getItem } = useMapCache();
  const eventBus = useEventBus();
  const chatState = useChatState();
  
  // Use provided focus function or default to the DOM-based one
  const focusChatInputFn = focusChatInputProp ?? focusChatInput;

  const createWidgetHandlers = (widget: Widget): WidgetHandlers => {
    const deps = { 
      createItemOptimistic, 
      updateItemOptimistic, 
      eventBus, 
      chatState,
      focusChatInput: focusChatInputFn
    };
    
    switch (widget.type) {
      case 'preview':
        return createPreviewHandlers(widget, deps);
      case 'creation':
        return createCreationHandlers(widget, deps);
      case 'mcp-keys':
        return {
          handleCancel: () => {
            chatState.closeWidget(widget.id);
            focusChatInputFn();
          }
        };
      case 'debug-logs':
        return {
          handleCancel: () => {
            chatState.closeWidget(widget.id);
            focusChatInputFn();
          }
        };
      case 'login':
        return {
          handleCancel: () => {
            chatState.closeWidget(widget.id);
            focusChatInputFn();
          }
        };
      case 'delete':
        return {
          handleCancel: () => {
            chatState.closeWidget(widget.id);
            focusChatInputFn();
          }
        };
      case 'error':
        return {
          handleCancel: () => {
            chatState.closeWidget(widget.id);
            focusChatInputFn();
          }
        };
      default:
        return {};
    }
  };

  return (
    <>
      {widgets.map((widget) => (
        <div key={widget.id} className="w-full">
          {_renderWidget(widget, createWidgetHandlers, getItem)}
        </div>
      ))}
    </>
  );
}

function _renderWidget(
  widget: Widget, 
  createWidgetHandlers: (widget: Widget) => WidgetHandlers, 
  getItem: (coordId: string) => TileData | null
): ReactNode {
  
  switch (widget.type) {
    case 'preview':
      return renderPreviewWidget(widget, createWidgetHandlers(widget), getItem);
    case 'login':
      return renderLoginWidget(widget, createWidgetHandlers(widget));
    case 'error':
      return renderErrorWidget(widget, createWidgetHandlers(widget));
    case 'creation':
      return renderCreationWidget(widget, createWidgetHandlers(widget));
    case 'loading':
      return renderLoadingWidget(widget);
    case 'delete':
      return renderDeleteWidget(widget, createWidgetHandlers(widget));
    case 'ai-response':
      return renderAIResponseWidget(widget);
    case 'mcp-keys':
      return renderMcpKeysWidget(widget, createWidgetHandlers(widget));
    case 'debug-logs':
      return renderDebugLogsWidget(widget, createWidgetHandlers(widget));
    default:
      return null;
  }
}