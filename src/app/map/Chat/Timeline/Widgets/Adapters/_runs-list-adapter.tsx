import type { Widget } from '~/app/map/Chat/_state';
import { RunsListWidget } from '~/app/map/Chat/Timeline/Widgets/RunsListWidget';
import type { WidgetHandlers } from '~/app/map/Chat/Timeline/Widgets/Adapters';

export function _renderRunsListWidget(widget: Widget, handlers: WidgetHandlers) {
  return (
    <RunsListWidget
      key={widget.id}
      onClose={handlers.handleCancel}
      onOpenRun={handlers.showRunWidget}
    />
  );
}
