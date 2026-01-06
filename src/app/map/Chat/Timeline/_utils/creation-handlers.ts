import type { Widget } from '~/app/map/Chat/_state';
import { focusChatInput } from '~/app/map/Chat/Timeline/_utils/focus-helpers';
import type { EventBusService } from '~/app/map/types';

interface CreationHandlerDeps {
  createItemOptimistic: (coordId: string, data: {
    parentId?: number;
    title?: string;
    name?: string;
    preview?: string;
    description?: string;
    itemType: string;
  }) => Promise<void>;
  eventBus: EventBusService | null;
  chatState: {
    closeWidget: (id: string) => void;
  };
}

export function createCreationHandlers(
  widget: Widget,
  deps: CreationHandlerDeps
) {
  const { createItemOptimistic, eventBus, chatState } = deps;

  const handleSave = async (name: string, preview: string, content: string, itemType = "context") => {
    const creationData = widget.data as { coordId?: string; parentName?: string; parentCoordId?: string; parentId?: string };

    try {
      await createItemOptimistic(creationData.coordId!, {
        title: name,
        preview: preview,
        description: content,
        parentId: creationData.parentId ? parseInt(creationData.parentId, 10) : undefined,
        itemType,
      });

      // Note: map.tile_created event is already emitted by MutationCoordinator
      // No need to emit it here to avoid duplicate events

      chatState.closeWidget(widget.id);
      focusChatInput();
    } catch (error) {
      eventBus?.emit({
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
    chatState.closeWidget(widget.id);
    focusChatInput();
  };

  return { handleSave, handleCancel };
}