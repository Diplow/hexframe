import type { Widget } from '~/app/map/Chat/_state';
import type { TileData } from '~/app/map/types';
import type { ReactNode } from 'react';
import type { WidgetHandlers } from '~/app/map/Chat/Timeline/_components/_renderers/widget-renderers';
import {
  renderTileWidget,
  renderLoginWidget,
  renderErrorWidget,
  renderCreationWidget,
  renderLoadingWidget,
  renderDeleteWidget,
  renderDeleteChildrenWidget,
  renderAIResponseWidget,
  renderMcpKeysWidget,
  renderDebugLogsWidget
} from '~/app/map/Chat/Timeline/_components/_renderers/widget-renderers';

export function _renderWidget(
  widget: Widget,
  handlers: WidgetHandlers,
  getItem: (coordId: string) => TileData | null,
): ReactNode {
  switch (widget.type) {
    case 'tile':
      return renderTileWidget(widget, handlers, getItem);
    case 'login':
      return renderLoginWidget(widget, handlers);
    case 'error':
      return renderErrorWidget(widget, handlers);
    case 'creation':
      return renderCreationWidget(widget, handlers);
    case 'loading':
      return renderLoadingWidget(widget);
    case 'delete':
      return renderDeleteWidget(widget, handlers);
    case 'delete_children':
      return renderDeleteChildrenWidget(widget, handlers);
    case 'ai-response':
      return renderAIResponseWidget(widget);
    case 'mcp-keys':
      return renderMcpKeysWidget(widget, handlers);
    case 'debug-logs':
      return renderDebugLogsWidget(widget, handlers);
    default:
      return null;
  }
}
