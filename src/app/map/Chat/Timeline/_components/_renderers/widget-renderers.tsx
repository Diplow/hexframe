import type { Widget, TileSelectedPayload, AuthRequiredPayload, ErrorOccurredPayload } from '~/app/map/Chat/_state';
import type { TileData } from '~/app/map/types';
import {
  TileWidget,
  CreationWidget,
  LoginWidget,
  ConfirmDeleteWidget,
  LoadingWidget,
  ErrorWidget,
  AIResponseWidget,
  McpKeysWidget,
  DebugLogsWidget
} from '~/app/map/Chat/Timeline/Widgets';
import type { AIResponseWidgetData } from '~/app/map/Chat/types';

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
  const tileData = widget.data as TileSelectedPayload;
  const {
    handleEdit = () => { /* noop */ },
    handleDelete = () => { /* noop */ },
    handleTileSave = () => { /* noop */ },
    handleTileClose = () => { /* noop */ }
  } = handlers;

  const tileItem = getItem(tileData.tileId);
  const currentTitle = tileItem?.data.title ?? tileData.tileData.title;
  const currentPreview = tileItem?.data.preview ?? '';
  const currentContent = tileItem?.data.content ?? tileData.tileData.content ?? '';
  // Get color from the cached tile data (preferred) or generate from coordinates
  const tileColor = tileItem?.data.color;

  return (
    <TileWidget
      tileId={tileData.tileId}
      title={currentTitle}
      preview={currentPreview}
      content={currentContent}
      tileColor={tileColor}
      openInEditMode={tileData.openInEditMode}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onSave={handleTileSave}
      onClose={handleTileClose}
    />
  );
}

export function renderLoginWidget(widget: Widget, handlers: WidgetHandlers) {
  const loginData = widget.data as AuthRequiredPayload;
  const { handleCancel = () => { /* noop */ } } = handlers;
  return (
    <LoginWidget
      message={loginData.reason}
      onClose={handleCancel}
    />
  );
}

// Define interface for alternative error format
interface AlternativeErrorPayload {
  message?: string;
  details?: unknown;
  severity?: string;
}

// Union type for both error payload structures
type ErrorWidgetData = ErrorOccurredPayload | AlternativeErrorPayload;

export function renderErrorWidget(widget: Widget, handlers: WidgetHandlers) {
  const { handleCancel = () => { /* noop */ } } = handlers;

  // Handle both error payload structures:
  // 1. ErrorOccurredPayload: {error, context, retryable}
  // 2. Alternative format: {message, details, severity}
  const errorData = widget.data as ErrorWidgetData;

  // Extract error message from either structure
  const errorMessage =
    ('error' in errorData ? errorData.error : undefined) ??
    ('message' in errorData ? errorData.message : undefined) ??
    'An error occurred';

  // Extract context/details from either structure
  const errorContext =
    ('context' in errorData ? errorData.context : undefined) ??
    ('details' in errorData ? errorData.details : undefined);

  // Extract operation type from context if available
  const operation =
    'context' in errorData &&
    errorData.context &&
    typeof errorData.context === 'object' &&
    errorData.context !== null &&
    'operation' in errorData.context
      ? (errorData.context as { operation?: string }).operation as 'create' | 'update' | 'delete' | 'move' | 'swap' | undefined
      : undefined;

  // Only show technical details for ErrorOccurredPayload (has 'error' and 'context' fields)
  // Don't show details for user-facing validation errors (has 'message' and 'details' fields)
  const shouldShowTechnicalDetails = 'error' in errorData && 'context' in errorData;

  return (
    <ErrorWidget
      message={errorMessage}
      error={shouldShowTechnicalDetails && errorContext ? safeStringify(errorContext, 2) : undefined}
      operation={operation}
      retry={
        'retryable' in errorData && errorData.retryable ? () => {
          // Handle retry
        } : undefined
      }
      onDismiss={handleCancel}
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

export function renderDeleteWidget(widget: Widget, handlers: WidgetHandlers) {
  const deleteData = widget.data as { tileId?: string; tileName?: string; tile?: { id: string; title: string; coordId: string } };
  const { handleCancel = () => { /* noop */ } } = handlers;

  const tileCoordId = deleteData.tile?.coordId ?? deleteData.tileId ?? '';
  const tileName = deleteData.tileName ?? deleteData.tile?.title ?? 'item';

  return (
    <ConfirmDeleteWidget
      tileId={tileCoordId}
      tileName={tileName}
      widgetId={widget.id}
      onClose={handleCancel}
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

export function renderMcpKeysWidget(widget: Widget, handlers: WidgetHandlers) {
  const { handleCancel = () => { /* noop */ } } = handlers;
  return (
    <McpKeysWidget
      onClose={handleCancel}
    />
  );
}

export function renderDebugLogsWidget(widget: Widget, handlers: WidgetHandlers) {
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