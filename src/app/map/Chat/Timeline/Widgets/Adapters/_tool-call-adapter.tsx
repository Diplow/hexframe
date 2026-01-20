import type { Widget, ToolCallWidgetData } from '~/app/map/Chat/_state';
import { ToolCallWidget } from '~/app/map/Chat/Timeline/Widgets';

export function _renderToolCallWidget(widget: Widget) {
  const data = widget.data as ToolCallWidgetData;
  return (
    <ToolCallWidget
      toolName={data.toolName}
      arguments={data.arguments}
      status={data.status}
      result={data.result}
    />
  );
}
