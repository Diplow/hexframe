import type { Widget } from '../_state/types';
import type { TileSelectedPayload, AuthRequiredPayload, ErrorOccurredPayload } from '../_state/_events/event.types';
import type { TileData } from '../../types/tile-data';
import { PreviewWidget } from '../Widgets/PreviewWidget';
import { CreationWidget } from '../Widgets/CreationWidget';
import { LoginWidget } from '../Widgets/LoginWidget';
import { ConfirmDeleteWidget } from '../Widgets/ConfirmDeleteWidget';
import { LoadingWidget } from '../Widgets/LoadingWidget';
import { ErrorWidget } from '../Widgets/ErrorWidget';
import { useMapCache } from '../../Cache/_hooks/use-map-cache';
import { useEventBus } from '../../Services/EventBus/event-bus-context';

interface WidgetManagerProps {
  widgets: Widget[];
}

export function WidgetManager({ widgets }: WidgetManagerProps) {
  const { createItemOptimistic, updateItemOptimistic, items } = useMapCache();
  const eventBus = useEventBus();

  const createWidgetHandlers = (widget: Widget) => {
    // Creation widget handlers
    const handleSave = async (name: string, description: string) => {
      const creationData = widget.data as { coordId?: string; parentName?: string; parentCoordId?: string; parentId?: string };
      
      try {
        // Create the tile using the map cache
        await createItemOptimistic(creationData.coordId!, {
          title: name,
          description: description,
          parentId: creationData.parentId ? parseInt(creationData.parentId, 10) : undefined
        });
        
        // Emit tile created event
        eventBus.emit({
          type: 'map.tile_created',
          payload: {
            tileId: creationData.coordId!,
            parentId: creationData.parentId || null,
            title: name,
            content: description
          },
          source: 'chat_cache',
          timestamp: new Date(),
        });
      } catch (error) {
        // Handle error
        eventBus.emit({
          type: 'error.occurred',
          payload: {
            operation: 'create',
            tileId: creationData.coordId!,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: `Failed to create tile: ${error instanceof Error ? error.message : 'Unknown error'}`
          },
          source: 'chat_cache',
          timestamp: new Date(),
        });
      }
    };

    const handleCancel = () => {
      // Widget cancellation handled internally by chat state
    };

    // Preview widget handlers
    const handleEdit = () => {
      // The PreviewWidget component will handle the edit mode internally
      // This handler is called from the preview widget's menu
      // The widget already has editing capability built-in
    };
    
    const handleDelete = () => {
      // Dispatch delete confirmation widget
      const previewData = widget.data as TileSelectedPayload;
      
      eventBus.emit({
        type: 'map.delete_requested',
        payload: {
          tileId: previewData.tileData.coordId, // Use coordId for deletion
          tileName: previewData.tileData.title
        },
        source: 'chat_cache',
        timestamp: new Date(),
      });
    };
    
    const handlePreviewSave = async (title: string, content: string) => {
      const previewData = widget.data as TileSelectedPayload;
      try {
        await updateItemOptimistic(previewData.tileId, {
          title,
          description: content,
        });
        
        eventBus.emit({
          type: 'map.tile_updated',
          payload: {
            tileId: previewData.tileId,
            title: title,
            content: content
          },
          source: 'chat_cache',
          timestamp: new Date(),
        });
      } catch (error) {
        eventBus.emit({
          type: 'error.occurred',
          payload: {
            operation: 'update',
            tileId: previewData.tileId,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: `Failed to update tile: ${error instanceof Error ? error.message : 'Unknown error'}`
          },
          source: 'chat_cache',
          timestamp: new Date(),
        });
      }
    };

    return { handleSave, handleCancel, handleEdit, handleDelete, handlePreviewSave };
  };

  return (
    <>
      {widgets.map((widget) => (
        <div key={widget.id} className="w-full">
          {renderWidget(widget, createWidgetHandlers, items)}
        </div>
      ))}
    </>
  );
}

interface WidgetHandlers {
  handleEdit?: () => void;
  handleDelete?: () => void;
  handlePreviewSave?: (title: string, content: string) => void;
  handleSave?: (name: string, description: string) => void;
  handleCancel?: () => void;
}

function renderWidget(widget: Widget, createWidgetHandlers: (widget: Widget) => WidgetHandlers, items: Record<string, TileData>) {
  switch (widget.type) {
    case 'preview':
      return _renderPreviewWidget(widget, createWidgetHandlers, items);
    
    case 'login':
      return _renderLoginWidget(widget);
    
    case 'error':
      return _renderErrorWidget(widget);
    
    case 'creation':
      return _renderCreationWidget(widget, createWidgetHandlers);
    
    case 'loading':
      return _renderLoadingWidget(widget);
    
    case 'delete':
      return _renderDeleteWidget(widget);
    
    default:
      return null;
  }
}

function _renderPreviewWidget(widget: Widget, createWidgetHandlers: (widget: Widget) => WidgetHandlers, items: Record<string, TileData>) {
  const previewData = widget.data as TileSelectedPayload;
  const { handleEdit = () => { /* noop */ }, handleDelete = () => { /* noop */ }, handlePreviewSave = () => { /* noop */ } } = createWidgetHandlers(widget);

  // Get real-time data from the map cache
  // The tileId is actually a coordinate ID, so we can look it up directly
  const tileItem = items[previewData.tileId];
  
  // Use real-time data if available, otherwise fall back to widget data
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
        // Handle retry
      } : undefined}
    />
  );
}

function _renderCreationWidget(widget: Widget, createWidgetHandlers: (widget: Widget) => WidgetHandlers) {
  const creationData = widget.data as { coordId?: string; parentName?: string; parentCoordId?: string; parentId?: string };
  const { handleSave = () => { /* noop */ }, handleCancel = () => { /* noop */ } } = createWidgetHandlers(widget);

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
  
  // Use coordinate ID for deletion (deleteItemOptimistic expects coordinate ID)
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