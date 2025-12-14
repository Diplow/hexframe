import type { Widget, useChatOperations } from '~/app/map/Chat/_state';
import type { WidgetHandlers } from '~/app/map/Chat/Timeline/_components/_renderers/widget-renderers';
import { createCreationHandlers } from '~/app/map/Chat/Timeline/_utils/creation-handlers';
import { createTileHandlers } from '~/app/map/Chat/Timeline/_utils/tile-handlers';
import { insertTextIntoChatInput } from '~/app/map/Chat/Timeline/_utils/focus-helpers';
import type { useMapCache } from '~/app/map/Cache';
import type { useEventBus } from '~/app/map/Services/EventBus';

interface HandlerDependencies {
  createItemOptimistic: ReturnType<typeof useMapCache>['createItemOptimistic'];
  updateItemOptimistic: ReturnType<typeof useMapCache>['updateItemOptimistic'];
  updateVisibilityWithDescendantsOptimistic: ReturnType<typeof useMapCache>['updateVisibilityWithDescendantsOptimistic'];
  getItem: ReturnType<typeof useMapCache>['getItem'];
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
      return createTileHandlers(widget, {
        updateItemOptimistic: deps.updateItemOptimistic,
        updateVisibilityWithDescendantsOptimistic: deps.updateVisibilityWithDescendantsOptimistic,
        eventBus: deps.eventBus,
        chatState: deps.chatState,
      });
    case 'creation':
      return createCreationHandlers(widget, deps);
    case 'mcp-keys':
    case 'debug-logs':
    case 'login':
    case 'delete':
    case 'error':
      return _createSimpleCloseHandler(widget.id, deps.chatState, deps.focusChatInput);
    case 'favorites':
      return {
        handleCancel: () => {
          deps.chatState.closeWidget(widget.id);
          deps.focusChatInput();
        },
        onInsertToChat: (text: string) => {
          insertTextIntoChatInput(text);
        }
      };
    default:
      return {};
  }
}
