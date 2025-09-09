import type { Widget } from '~/app/map/Chat/_state/types';
import type { TileData } from '~/app/map/types';
import type { ReactNode } from 'react';
import { useMapCache } from '~/app/map/Cache';
import { useEventBus } from '~/app/map/Services';
import { useChatState } from '~/app/map/Chat/_state';
import { createCreationHandlers } from '~/app/map/Chat/Timeline/_handlers/creation-handlers';
import { createPreviewHandlers } from '~/app/map/Chat/Timeline/_handlers/preview-handlers';
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
  type WidgetHandlers
} from '~/app/map/Chat/Timeline/_renderers/widget-renderers';

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
      return renderLoginWidget(widget);
    case 'error':
      return renderErrorWidget(widget);
    case 'creation':
      return renderCreationWidget(widget, createWidgetHandlers(widget));
    case 'loading':
      return renderLoadingWidget(widget);
    case 'delete':
      return renderDeleteWidget(widget);
    case 'ai-response':
      return renderAIResponseWidget(widget);
    case 'mcp-keys':
      return renderMcpKeysWidget(widget, createWidgetHandlers(widget));
    default:
      return null;
  }
}