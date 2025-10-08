import type { Widget } from '~/app/map/Chat/_state';
import { AIResponseWidget, McpKeysWidget, DebugLogsWidget, LoadingWidget } from '~/app/map/Chat/Timeline/Widgets';
import type { AIResponseWidgetData } from '~/app/map/Chat/types';
import type { WidgetHandlers } from '~/app/map/Chat/Timeline/_components/_renderers/widget-renderers';

export function _renderLoadingWidget(widget: Widget) {
  const loadingData = widget.data as { message?: string; operation?: string };
  return (
    <LoadingWidget
      message={loadingData.message ?? 'Loading...'}
      operation={loadingData.operation as 'create' | 'update' | 'delete' | 'move' | 'swap' | undefined}
    />
  );
}

export function _renderAIResponseWidget(widget: Widget) {
  const data = widget.data as AIResponseWidgetData;
  return (
    <AIResponseWidget
      jobId={data.jobId}
      initialResponse={data.initialResponse}
      model={data.model}
    />
  );
}

export function _renderMcpKeysWidget(widget: Widget, handlers: WidgetHandlers) {
  const { handleCancel = () => { /* noop */ } } = handlers;
  return (
    <McpKeysWidget
      onClose={handleCancel}
    />
  );
}

export function _renderDebugLogsWidget(widget: Widget, handlers: WidgetHandlers) {
  const { handleCancel = () => { /* noop */ } } = handlers;
  const data = widget.data as { title: string; content: string };
  return (
    <DebugLogsWidget
      title={data.title}
      content={data.content}
      onClose={handleCancel}
    />
  );
}
