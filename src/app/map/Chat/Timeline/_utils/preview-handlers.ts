import type { Widget, TileSelectedPayload } from '~/app/map/Chat/_state';
import { focusChatInput } from '~/app/map/Chat/Timeline/_utils/focus-helpers';
import type { EventBusService } from '~/app/map/types';

interface PreviewHandlerDeps {
  updateItemOptimistic: (tileId: string, data: {
    title?: string;
    name?: string;
    description?: string;
  }) => Promise<void>;
  eventBus: EventBusService | null;
  chatState: {
    closeWidget: (id: string) => void;
  };
}

export function createPreviewHandlers(
  widget: Widget,
  deps: PreviewHandlerDeps
) {
  const { updateItemOptimistic, eventBus, chatState } = deps;

  const handleEdit = () => {
    // The PreviewWidget component handles edit mode internally
  };
  
  const handleDelete = () => {
    const previewData = widget.data as TileSelectedPayload;
    
    eventBus?.emit({
      type: 'map.delete_requested',
      payload: {
        tileId: previewData.tileData.coordId,
        tileName: previewData.tileData.title
      },
      source: 'chat_cache',
      timestamp: new Date(),
    });
  };
  
  const handlePreviewClose = () => {
    chatState.closeWidget(widget.id);
    focusChatInput();
  };
  
  const handlePreviewSave = async (title: string, content: string) => {
    const previewData = widget.data as TileSelectedPayload;
    try {
      await updateItemOptimistic(previewData.tileId, {
        title,
        description: content,
      });
      
      eventBus?.emit({
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
      eventBus?.emit({
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

  return { handleEdit, handleDelete, handlePreviewSave, handlePreviewClose };
}