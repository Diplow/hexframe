import type { Widget } from '../Cache/types';
import type { TileSelectedPayload, AuthRequiredPayload, ErrorOccurredPayload } from '../Cache/_events/event.types';
import { PreviewWidget } from '../Widgets/PreviewWidget';
import { CreationWidget } from '../Widgets/CreationWidget';
import { LoginWidget } from '../Widgets/LoginWidget';
import { ConfirmDeleteWidget } from '../Widgets/ConfirmDeleteWidget';
import { LoadingWidget } from '../Widgets/LoadingWidget';
import { ErrorWidget } from '../Widgets/ErrorWidget';

interface WidgetManagerProps {
  widgets: Widget[];
}

export function WidgetManager({ widgets }: WidgetManagerProps) {
  return (
    <>
      {widgets.map((widget) => (
        <div key={widget.id} className="w-full">
          {renderWidget(widget)}
        </div>
      ))}
    </>
  );
}

function renderWidget(widget: Widget) {
  switch (widget.type) {
    case 'preview':
      return _renderPreviewWidget(widget);
    
    case 'login':
      return _renderLoginWidget(widget);
    
    case 'error':
      return _renderErrorWidget(widget);
    
    case 'creation':
      return _renderCreationWidget(widget);
    
    case 'loading':
      return _renderLoadingWidget(widget);
    
    case 'delete':
      return _renderDeleteWidget(widget);
    
    default:
      return null;
  }
}

function _renderPreviewWidget(widget: Widget) {
  const previewData = widget.data as TileSelectedPayload;
  return (
    <PreviewWidget
      tileId={previewData.tileId}
      title={previewData.tileData.title}
      content={previewData.tileData.content ?? ''}
    />
  );
}

function _renderLoginWidget(widget: Widget) {
  const loginData = widget.data as AuthRequiredPayload;
  return (
    <LoginWidget
      message={loginData.reason}
    />
  );
}

function _renderErrorWidget(widget: Widget) {
  const errorData = widget.data as ErrorOccurredPayload;
  return (
    <ErrorWidget
      message={errorData.error}
      error={errorData.context ? JSON.stringify(errorData.context) : undefined}
      retry={errorData.retryable ? () => {
        console.log('Retry requested');
      } : undefined}
    />
  );
}

function _renderCreationWidget(widget: Widget) {
  const creationData = widget.data as { coordId?: string; parentName?: string; parentCoordId?: string };
  return (
    <CreationWidget
      coordId={creationData.coordId ?? ''}
      parentName={creationData.parentName}
      parentCoordId={creationData.parentCoordId}
    />
  );
}

function _renderLoadingWidget(widget: Widget) {
  const loadingData = widget.data as { message?: string; operation?: string };
  return (
    <LoadingWidget
      message={loadingData.message ?? 'Loading...'}
      operation={loadingData.operation as 'create' | 'update' | 'delete' | 'move' | 'swap' | undefined}
    />
  );
}

function _renderDeleteWidget(widget: Widget) {
  const deleteData = widget.data as { tileId?: string; tileName?: string; tile?: { id: string; title: string; coordId: string } };
  return (
    <ConfirmDeleteWidget
      tileId={deleteData.tileId ?? deleteData.tile?.id ?? ''}
      tileName={deleteData.tileName ?? deleteData.tile?.title ?? 'item'}
    />
  );
}