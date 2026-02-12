import type { Widget } from '~/app/map/Chat/_state';
import { RunWidget } from '~/app/map/Chat/Timeline/Widgets/RunWidget';
import type { WidgetHandlers } from '~/app/map/Chat/Timeline/Widgets/Adapters';

interface RunWidgetData {
  tileCoords: string;
  tileTitle: string;
}

export function _renderRunWidget(widget: Widget, handlers: WidgetHandlers) {
  const data = widget.data as RunWidgetData;
  return (
    <RunWidget
      tileCoords={data.tileCoords}
      tileTitle={data.tileTitle}
      onClose={handlers.handleCancel}
    />
  );
}
