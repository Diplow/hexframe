import type { Widget } from '../Cache/types';
import type { TileSelectedPayload, AuthRequiredPayload, ErrorOccurredPayload } from '../Cache/_events/event.types';
import type { TileData } from '../../types/tile-data';
import { PreviewWidget } from '../Widgets/PreviewWidget';
import { CreationWidget } from '../Widgets/CreationWidget';
import { LoginWidget } from '../Widgets/LoginWidget';
import { ConfirmDeleteWidget } from '../Widgets/ConfirmDeleteWidget';
import { LoadingWidget } from '../Widgets/LoadingWidget';
import { ErrorWidget } from '../Widgets/ErrorWidget';
import { useMapCache } from '../../Cache/_hooks/use-map-cache';
import { useChatCacheOperations } from '../Cache/hooks/useChatCacheOperations';

interface WidgetManagerProps {
  widgets: Widget[];
}

export function WidgetManager({ widgets }: WidgetManagerProps) {
  const { createItemOptimistic, updateItemOptimistic, items } = useMapCache();
  const { dispatch } = useChatCacheOperations();

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
        
        // Notify chat cache that widget is resolved
        dispatch({
          type: 'widget_resolved',
          payload: {
            widgetId: widget.id,
            action: 'created',
            result: { name, description }
          },
          id: `widget-resolved-${Date.now()}`,
          timestamp: new Date(),
          actor: 'user',
        });
        
        // Send operation completed event
        dispatch({
          type: 'operation_completed',
          payload: {
            operation: 'create',
            tileId: creationData.coordId!,
            result: 'success',
            message: `Created tile "${name}"`
          },
          id: `tile-created-${Date.now()}`,
          timestamp: new Date(),
          actor: 'user',
        });
      } catch (error) {
        // Handle error
        dispatch({
          type: 'operation_completed',
          payload: {
            operation: 'create',
            tileId: creationData.coordId!,
            result: 'failure',
            message: `Failed to create tile: ${error instanceof Error ? error.message : 'Unknown error'}`
          },
          id: `tile-create-error-${Date.now()}`,
          timestamp: new Date(),
          actor: 'system',
        });
      }
    };

    const handleCancel = () => {
      dispatch({
        type: 'widget_resolved',
        payload: {
          widgetId: widget.id,
          action: 'cancelled'
        },
        id: `widget-resolved-${Date.now()}`,
        timestamp: new Date(),
        actor: 'user',
      });
    };

    // Preview widget handlers
    const handleEdit = () => {
      // Open edit mode directly in the preview widget
      const previewData = widget.data as TileSelectedPayload;
      console.log('Edit tile:', previewData.tileId);
    };
    
    const handleDelete = () => {
      // Dispatch delete confirmation widget
      const previewData = widget.data as TileSelectedPayload;
      console.log('[WidgetManager] 🔥 handleDelete called for:', {
        tileId: previewData.tileId,
        tileName: previewData.tileData.title,
        coordId: previewData.tileData.coordId
      });
      
      const deleteEventId = `delete-${Date.now()}`;
      console.log('[WidgetManager] 📤 Dispatching operation_started event:', deleteEventId);
      
      dispatch({
        type: 'operation_started',
        payload: {
          operation: 'delete',
          tileId: previewData.tileId,
          data: {
            tileId: previewData.tileId,
            tileName: previewData.tileData.title,
            tile: {
              id: previewData.tileId,
              title: previewData.tileData.title,
              coordId: previewData.tileData.coordId,
            }
          }
        },
        id: deleteEventId,
        timestamp: new Date(),
        actor: 'user',
      });
    };
    
    const handlePreviewSave = async (title: string, content: string) => {
      const previewData = widget.data as TileSelectedPayload;
      try {
        await updateItemOptimistic(previewData.tileId, {
          title,
          description: content,
        });
        
        dispatch({
          type: 'operation_completed',
          payload: {
            operation: 'update',
            tileId: previewData.tileId,
            result: 'success',
            message: `Updated tile "${title}"`
          },
          id: `tile-updated-${Date.now()}`,
          timestamp: new Date(),
          actor: 'user',
        });
      } catch (error) {
        dispatch({
          type: 'operation_completed',
          payload: {
            operation: 'update',
            tileId: previewData.tileId,
            result: 'failure',
            message: `Failed to update tile: ${error instanceof Error ? error.message : 'Unknown error'}`
          },
          id: `tile-update-error-${Date.now()}`,
          timestamp: new Date(),
          actor: 'system',
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

function renderWidget(widget: Widget, createWidgetHandlers: (widget: Widget) => any, items: Record<string, TileData>) {
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

function _renderPreviewWidget(widget: Widget, createWidgetHandlers: (widget: Widget) => any, items: Record<string, TileData>) {
  const previewData = widget.data as TileSelectedPayload;
  const { handleEdit, handleDelete, handlePreviewSave } = createWidgetHandlers(widget);

  console.log('[PreviewWidget] 📋 Rendering with data:', {
    tileId: previewData.tileId,
    widgetDataTitle: previewData.tileData.title,
    totalItemsInCache: Object.keys(items).length,
  });

  // Get real-time data from the map cache
  // The tileId is actually a coordinate ID, so we can look it up directly
  const tileItem = items[previewData.tileId];
  
  console.log('[PreviewWidget] 🔍 Found in cache:', {
    found: !!tileItem,
    cacheTitle: tileItem?.data.name,
    cacheContent: tileItem?.data.description,
    dbId: tileItem?.metadata.dbId,
    coordId: tileItem?.metadata.coordId,
  });
  
  // Use real-time data if available, otherwise fall back to widget data
  const currentTitle = tileItem?.data.name ?? previewData.tileData.title;
  const currentContent = tileItem?.data.description ?? previewData.tileData.content ?? '';

  console.log('[PreviewWidget] 📝 Using values:', {
    currentTitle,
    currentContent,
  });

  return (
    <PreviewWidget
      tileId={previewData.tileId}
      title={currentTitle}
      content={currentContent}
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
        console.log('Retry requested');
      } : undefined}
    />
  );
}

function _renderCreationWidget(widget: Widget, createWidgetHandlers: (widget: Widget) => any) {
  const creationData = widget.data as { coordId?: string; parentName?: string; parentCoordId?: string; parentId?: string };
  const { handleSave, handleCancel } = createWidgetHandlers(widget);

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
  
  console.log('[WidgetManager] 🗑️ Rendering delete widget:', { 
    widgetId: widget.id,
    tileCoordId, 
    tileName, 
    rawData: deleteData,
    timestamp: new Date().toISOString()
  });
  
  return (
    <ConfirmDeleteWidget
      tileId={tileCoordId}
      tileName={tileName}
      widgetId={widget.id}
    />
  );
}