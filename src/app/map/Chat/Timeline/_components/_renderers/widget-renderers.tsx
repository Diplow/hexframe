import type { Widget } from '~/app/map/Chat/_state';
import type { TileData } from '~/app/map/types';
import { _renderTileWidget, _renderCreationWidget, _renderDeleteWidget } from '~/app/map/Chat/Timeline/_components/_renderers/_tile-renderers';
import { _renderLoginWidget, _renderErrorWidget } from '~/app/map/Chat/Timeline/_components/_renderers/_auth-error-renderers';
import { _renderLoadingWidget, _renderAIResponseWidget, _renderMcpKeysWidget, _renderDebugLogsWidget } from '~/app/map/Chat/Timeline/_components/_renderers/_ai-debug-renderers';

export interface WidgetHandlers {
  handleEdit?: () => void;
  handleDelete?: () => void;
  handleTileSave?: (title: string, preview: string, content: string) => void;
  handleTileClose?: () => void;
  handleSave?: (name: string, preview: string, content: string) => void;
  handleCancel?: () => void;
}

export function renderTileWidget(
  widget: Widget,
  handlers: WidgetHandlers,
  getItem: (coordId: string) => TileData | null,
) {
  return _renderTileWidget(widget, handlers, getItem);
}

export function renderLoginWidget(widget: Widget, handlers: WidgetHandlers) {
  return _renderLoginWidget(widget, handlers);
}

export function renderErrorWidget(widget: Widget, handlers: WidgetHandlers) {
  return _renderErrorWidget(widget, handlers);
}

export function renderCreationWidget(widget: Widget, handlers: WidgetHandlers) {
  return _renderCreationWidget(widget, handlers);
}

export function renderLoadingWidget(widget: Widget) {
  return _renderLoadingWidget(widget);
}

export function renderDeleteWidget(widget: Widget, handlers: WidgetHandlers) {
  return _renderDeleteWidget(widget, handlers);
}

export function renderAIResponseWidget(widget: Widget) {
  return _renderAIResponseWidget(widget);
}

export function renderMcpKeysWidget(widget: Widget, handlers: WidgetHandlers) {
  return _renderMcpKeysWidget(widget, handlers);
}

export function renderDebugLogsWidget(widget: Widget, handlers: WidgetHandlers) {
  return _renderDebugLogsWidget(widget, handlers);
}