/**
 * Widget Adapters - Public API
 *
 * Transforms Widget state objects into Widget UI components.
 */

import type { Widget } from '~/app/map/Chat/_state';
import type { TileData } from '~/app/map/types';
import type { Visibility } from '~/lib/domains/mapping/utils';
import { _renderTileWidget, _renderCreationWidget, _renderDeleteWidget, _renderDeleteChildrenWidget } from '~/app/map/Chat/Timeline/Widgets/Adapters/_tile-adapters';
import { _renderLoginWidget, _renderErrorWidget } from '~/app/map/Chat/Timeline/Widgets/Adapters/_auth-error-adapters';
import { _renderLoadingWidget, _renderAIResponseWidget, _renderMcpKeysWidget, _renderDebugLogsWidget, _renderFavoritesWidget } from '~/app/map/Chat/Timeline/Widgets/Adapters/_ai-debug-adapters';
import { _renderToolCallWidget } from '~/app/map/Chat/Timeline/Widgets/Adapters/_tool-call-adapter';
import { _renderRunWidget } from '~/app/map/Chat/Timeline/Widgets/Adapters/_run-adapter';
import { _renderRunsListWidget } from '~/app/map/Chat/Timeline/Widgets/Adapters/_runs-list-adapter';

export interface WidgetHandlers {
  handleEdit?: () => void;
  handleDelete?: () => void;
  handleDeleteChildren?: () => void;
  handleDeleteComposed?: () => void;
  handleDeleteHexplan?: () => void;
  handleSetVisibility?: (visibility: Visibility) => void;
  handleSetVisibilityWithDescendants?: (visibility: Visibility) => void;
  handleTileSave?: (title: string, preview: string, content: string, itemType?: string) => void;
  handleTileClose?: () => void;
  handleSave?: (name: string, preview: string, content: string) => void;
  handleCancel?: () => void;
  onInsertToChat?: (text: string) => void;
  showRunWidget?: (coords: string, title: string) => void;
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

export function renderDeleteChildrenWidget(widget: Widget, handlers: WidgetHandlers) {
  return _renderDeleteChildrenWidget(widget, handlers);
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

export function renderFavoritesWidget(widget: Widget, handlers: WidgetHandlers) {
  return _renderFavoritesWidget(widget, handlers);
}

export function renderToolCallWidget(widget: Widget) {
  return _renderToolCallWidget(widget);
}

export function renderRunWidget(widget: Widget, handlers: WidgetHandlers) {
  return _renderRunWidget(widget, handlers);
}

export function renderRunsListWidget(widget: Widget, handlers: WidgetHandlers) {
  return _renderRunsListWidget(widget, handlers);
}
