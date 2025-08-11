import type { Widget } from '../_state/types';
import type { TileData } from '../../types/tile-data';
import { useMapCache } from '../../Cache/_hooks/use-map-cache';
import { useEventBus } from '../../Services/EventBus/event-bus-context';
import { useChatState } from '../_state';
import { createCreationHandlers } from './_handlers/creation-handlers';
import { createPreviewHandlers } from './_handlers/preview-handlers';
import { 
  renderPreviewWidget,
  renderLoginWidget,
  renderErrorWidget,
  renderCreationWidget,
  renderLoadingWidget,
  renderDeleteWidget,
  type WidgetHandlers
} from './_renderers/widget-renderers';

interface WidgetManagerProps {
  widgets: Widget[];
}

export function WidgetManager({ widgets }: WidgetManagerProps) {
  const { createItemOptimistic, updateItemOptimistic, items } = useMapCache();
  const eventBus = useEventBus();
  const chatState = useChatState();

  const createWidgetHandlers = (widget: Widget) => {
    const deps = { createItemOptimistic, updateItemOptimistic, eventBus, chatState };
    
    switch (widget.type) {
      case 'preview':
        return createPreviewHandlers(widget, deps);
      case 'creation':
        return createCreationHandlers(widget, deps);
      default:
        return {};
    }
  };

  return (
    <>
      {widgets.map((widget) => (
        <div key={widget.id} className="w-full">
          {_renderWidget(widget, createWidgetHandlers, items)}
        </div>
      ))}
    </>
  );
}

function _renderWidget(
  widget: Widget, 
  createWidgetHandlers: (widget: Widget) => WidgetHandlers, 
  items: Record<string, TileData>
) {
  const handlers = createWidgetHandlers(widget);

  switch (widget.type) {
    case 'preview':
      return renderPreviewWidget(widget, handlers, items);
    case 'login':
      return renderLoginWidget(widget);
    case 'error':
      return renderErrorWidget(widget);
    case 'creation':
      return renderCreationWidget(widget, handlers);
    case 'loading':
      return renderLoadingWidget(widget);
    case 'delete':
      return renderDeleteWidget(widget);
    default:
      return null;
  }
}