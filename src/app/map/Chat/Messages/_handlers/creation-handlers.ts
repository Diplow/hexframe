import type { Widget } from '../../_state/types';
import { focusChatInput } from '../_utils/focus-helpers';
import type { EventBusService } from '../../../Services/EventBus';

interface CreationHandlerDeps {
  createItemOptimistic: (coordId: string, data: {
    parentId?: number;
    title?: string;
    name?: string;
    description?: string;
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

  const handleSave = async (name: string, description: string) => {
    const creationData = widget.data as { coordId?: string; parentName?: string; parentCoordId?: string; parentId?: string };
    
    try {
      await createItemOptimistic(creationData.coordId!, {
        title: name,
        description: description,
        parentId: creationData.parentId ? parseInt(creationData.parentId, 10) : undefined
      });
      
      eventBus?.emit({
        type: 'map.tile_created',
        payload: {
          tileId: creationData.coordId!,
          parentId: creationData.parentId ?? null,
          title: name,
          content: description
        },
        source: 'chat_cache',
        timestamp: new Date(),
      });
      
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