import type { Widget } from '../_state/types';
import type { TileData } from '../../types/tile-data';
import type { ReactNode } from 'react';
import { useMapCache } from '../../Cache/interface';
import { useEventBus } from '../../Services/EventBus/event-bus-context';
import { useChatState } from '../_state';
import { createCreationHandlers } from './_handlers/creation-handlers';
import { createPreviewHandlers } from './_handlers/preview-handlers';
import { focusChatInput } from './_utils/focus-helpers';
import { 
  renderPreviewWidget,
  renderLoginWidget,
  renderErrorWidget,
  renderCreationWidget,
  renderLoadingWidget,
  renderDeleteWidget,
  renderAIResponseWidget,
  type WidgetHandlers
} from './_renderers/widget-renderers';

interface WidgetManagerProps {
  widgets: Widget[];
  focusChatInput?: () => void;
}

export function WidgetManager({ widgets, focusChatInput: focusChatInputProp }: WidgetManagerProps) {
  console.log('[WidgetManager] Rendering with', widgets.length, 'widgets')
  widgets.forEach(w => {
    console.log('[WidgetManager] Widget:', { id: w.id, type: w.type, hasData: !!w.data })
  })
  
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
  console.log('[_renderWidget] Rendering widget type:', widget.type, 'with id:', widget.id)
  
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
      console.log('[_renderWidget] Rendering AI response widget with data:', widget.data)
      return renderAIResponseWidget(widget);
    default:
      return null;
  }
}