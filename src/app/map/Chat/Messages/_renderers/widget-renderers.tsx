import type { Widget } from '../../_state/types';
import type { TileSelectedPayload, AuthRequiredPayload, ErrorOccurredPayload } from '../../_state/_events/event.types';
import type { TileData } from '../../../types/tile-data';
import { PreviewWidget } from '../../Widgets/PreviewWidget';
import { CreationWidget } from '../../Widgets/CreationWidget';
import { LoginWidget } from '../../Widgets/LoginWidget';
import { ConfirmDeleteWidget } from '../../Widgets/ConfirmDeleteWidget';
import { LoadingWidget } from '../../Widgets/LoadingWidget';
import { ErrorWidget } from '../../Widgets/ErrorWidget';
import { AIResponseWidget } from '../../Widgets/AIResponseWidget';
import type { AIResponseWidgetData } from '../../types';

function safeStringify(value: unknown, space = 0): string | undefined {
  try {
    return JSON.stringify(value, null, space);
  } catch {
    return undefined;
  }
}

export interface WidgetHandlers {
  handleEdit?: () => void;
  handleDelete?: () => void;
  handlePreviewSave?: (title: string, content: string) => void;
  handlePreviewClose?: () => void;
  handleSave?: (name: string, description: string) => void;
  handleCancel?: () => void;
}

export function renderPreviewWidget(
  widget: Widget,
  handlers: WidgetHandlers,
  getItem: (coordId: string) => TileData | null
) {
  const previewData = widget.data as TileSelectedPayload;
  const { 
    handleEdit = () => { /* noop */ }, 
    handleDelete = () => { /* noop */ }, 
    handlePreviewSave = () => { /* noop */ },
    handlePreviewClose = () => { /* noop */ }
  } = handlers;

  const tileItem = getItem(previewData.tileId);
  const currentTitle = tileItem?.data.name ?? previewData.tileData.title;
  const currentContent = tileItem?.data.description ?? previewData.tileData.content ?? '';

  return (
    <PreviewWidget
      tileId={previewData.tileId}
      title={currentTitle}
      content={currentContent}
      openInEditMode={previewData.openInEditMode}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onSave={handlePreviewSave}
      onClose={handlePreviewClose}
    />
  );
}

export function renderLoginWidget(widget: Widget) {
  const loginData = widget.data as AuthRequiredPayload;
  return (
    <LoginWidget
      message={loginData.reason}
    />
  );
}

export function renderErrorWidget(widget: Widget) {
  const errorData = widget.data as ErrorOccurredPayload;
  return (
    <ErrorWidget
      message={errorData.error}
      error={errorData.context ? safeStringify(errorData.context, 2) : undefined}
      retry={errorData.retryable ? () => {
        // Handle retry
      } : undefined}
    />
  );
}

export function renderCreationWidget(widget: Widget, handlers: WidgetHandlers) {
  const creationData = widget.data as { coordId?: string; parentName?: string; parentCoordId?: string; parentId?: string };
  const { handleSave = () => { /* noop */ }, handleCancel = () => { /* noop */ } } = handlers;

  return (
    <CreationWidget
      coordId={creationData.coordId ?? ''}
      parentName={creationData.parentName}
      parentCoordId={creationData.parentCoordId}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}

export function renderLoadingWidget(widget: Widget) {
  const loadingData = widget.data as { message?: string; operation?: string };
  return (
    <LoadingWidget
      message={loadingData.message ?? 'Loading...'}
      operation={loadingData.operation as 'create' | 'update' | 'delete' | 'move' | 'swap' | undefined}
    />
  );
}

export function renderDeleteWidget(widget: Widget) {
  const deleteData = widget.data as { tileId?: string; tileName?: string; tile?: { id: string; title: string; coordId: string } };
  
  const tileCoordId = deleteData.tile?.coordId ?? deleteData.tileId ?? '';
  const tileName = deleteData.tileName ?? deleteData.tile?.title ?? 'item';
  
  return (
    <ConfirmDeleteWidget
      tileId={tileCoordId}
      tileName={tileName}
      widgetId={widget.id}
    />
  );
}

export function renderAIResponseWidget(widget: Widget) {
  const data = widget.data as AIResponseWidgetData;
  return (
    <AIResponseWidget
      jobId={data.jobId}
      initialResponse={data.initialResponse}
      model={data.model}
    />
  );
}