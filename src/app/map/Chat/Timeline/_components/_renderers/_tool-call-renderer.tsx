import type { Widget } from '~/app/map/Chat/_state';
import type { ToolCallWidgetData } from '~/app/map/Chat/_state/_events/event.types';
import { ToolCallWidget } from '~/app/map/Chat/Timeline/Widgets/ToolCallWidget';

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
