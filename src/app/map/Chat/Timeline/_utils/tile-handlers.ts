import type { Widget, TileSelectedPayload } from '~/app/map/Chat/_state';
import { focusChatInput } from '~/app/map/Chat/Timeline/_utils/focus-helpers';
import type { EventBusService } from '~/app/map/types';

interface TileHandlerDeps {
  updateItemOptimistic: (tileId: string, data: {
    title?: string;
    name?: string;
    preview?: string;
    description?: string;
  }) => Promise<void>;
  eventBus: EventBusService | null;
  chatState: {
    closeWidget: (id: string) => void;
  };
}

export function createTileHandlers(
  widget: Widget,
  deps: TileHandlerDeps
) {
  const { updateItemOptimistic, eventBus, chatState } = deps;

  const handleEdit = () => {
    // The TileWidget component handles edit mode internally
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

  const handleDeleteChildren = () => {
    const previewData = widget.data as TileSelectedPayload;

    eventBus?.emit({
      type: 'map.delete_children_requested',
      payload: {
        tileId: previewData.tileData.coordId,
        tileName: previewData.tileData.title,
        directionType: 'structural',
      },
      source: 'chat_cache',
      timestamp: new Date(),
    });
  };

  const handleDeleteComposed = () => {
    const previewData = widget.data as TileSelectedPayload;

    eventBus?.emit({
      type: 'map.delete_children_requested',
      payload: {
        tileId: previewData.tileData.coordId,
        tileName: previewData.tileData.title,
        directionType: 'composed',
      },
      source: 'chat_cache',
      timestamp: new Date(),
    });
  };

  const handleDeleteExecutionHistory = () => {
    const previewData = widget.data as TileSelectedPayload;

    eventBus?.emit({
      type: 'map.delete_children_requested',
      payload: {
        tileId: previewData.tileData.coordId,
        tileName: previewData.tileData.title,
        directionType: 'executionHistory',
      },
      source: 'chat_cache',
      timestamp: new Date(),
    });
  };
  
  const handleTileClose = () => {
    chatState.closeWidget(widget.id);
    focusChatInput();
  };

  const handleTileSave = async (title: string, preview: string, content: string) => {
    const tileData = widget.data as TileSelectedPayload;
    try {
      // updateItemOptimistic already emits map.tile_updated via MutationCoordinator
      await updateItemOptimistic(tileData.tileId, {
        title,
        preview,
        description: content,
      });
    } catch (error) {
      eventBus?.emit({
        type: 'error.occurred',
        payload: {
          error: error instanceof Error ? error.message : 'Unknown error',
          context: { operation: 'update', tileId: tileData.tileId },
          retryable: true,
        },
        source: 'map_cache',
        timestamp: new Date(),
      });
    }
  };

  return {
    handleEdit,
    handleDelete,
    handleDeleteChildren,
    handleDeleteComposed,
    handleDeleteExecutionHistory,
    handleTileSave,
    handleTileClose,
  };
}