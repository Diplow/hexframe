import type { Widget } from '~/app/map/Chat/_state';
import type { WidgetHandlers } from '~/app/map/Chat/Timeline/_components/_renderers/widget-renderers';
import { createCreationHandlers } from '~/app/map/Chat/Timeline/_utils/creation-handlers';
import { createTileHandlers } from '~/app/map/Chat/Timeline/_utils/tile-handlers';
import type { useChatOperations } from '~/app/map/Chat/_state/_operations';
import type { useMapCache } from '~/app/map/Cache';
import type { useEventBus } from '~/app/map/Services';

interface HandlerDependencies {
  createItemOptimistic: ReturnType<typeof useMapCache>['createItemOptimistic'];
  updateItemOptimistic: ReturnType<typeof useMapCache>['updateItemOptimistic'];
  eventBus: ReturnType<typeof useEventBus>;
  chatState: ReturnType<typeof useChatOperations>;
  focusChatInput: () => void;
}

function _createSimpleCloseHandler(
  widgetId: string,
  chatState: ReturnType<typeof useChatOperations>,
  focusChatInput: () => void
): WidgetHandlers {
  return {
    handleCancel: () => {
      chatState.closeWidget(widgetId);
      focusChatInput();
    }
  };
}

export function _createWidgetHandlers(widget: Widget, deps: HandlerDependencies): WidgetHandlers {
  switch (widget.type) {
    case 'tile':
      return createTileHandlers(widget, deps);
    case 'creation':
      return createCreationHandlers(widget, deps);
    case 'mcp-keys':
    case 'debug-logs':
    case 'login':
    case 'delete':
    case 'error':
      return _createSimpleCloseHandler(widget.id, deps.chatState, deps.focusChatInput);
    default:
      return {};
  }
}
