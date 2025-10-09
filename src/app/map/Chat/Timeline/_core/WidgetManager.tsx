import type { Widget } from '~/app/map/Chat/_state';
import { useMapCache } from '~/app/map/Cache';
import { useEventBus } from '~/app/map/Services';
import { useChatState } from '~/app/map/Chat/_state';
import { focusChatInput } from '~/app/map/Chat/Timeline/_utils/focus-helpers';
import { _createWidgetHandlers } from '~/app/map/Chat/Timeline/_core/_widget-handler-factory';
import { _renderWidget } from '~/app/map/Chat/Timeline/_core/_widget-renderer-factory';

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

  const deps = {
    createItemOptimistic,
    updateItemOptimistic,
    eventBus,
    chatState,
    focusChatInput: focusChatInputFn
  };

  return (
    <>
      {widgets.map((widget) => {
        const handlers = _createWidgetHandlers(widget, deps);
        return (
          <div key={widget.id} className="w-full">
            {_renderWidget(widget, handlers, getItem)}
          </div>
        );
      })}
    </>
  );
}