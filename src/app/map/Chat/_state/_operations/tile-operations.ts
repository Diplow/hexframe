import type { ChatEvent } from '~/app/map/Chat/_state/_events/event.types';
import type { TileData } from '~/app/map/types';

/**
 * Tile-related operations
 */
export function createTileOperations(dispatch: (event: ChatEvent) => void) {
  return {
    showEditWidget(tile: TileData) {
      dispatch({
        type: 'tile_selected',
        payload: {
          tileId: tile.metadata.coordId,
          tileData: {
            id: tile.metadata.dbId.toString(),
            title: tile.data.name,
            description: tile.data.description,
        preview: undefined,
            content: tile.data.description,
            coordId: tile.metadata.coordId,
          },
          openInEditMode: true,
        },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'system',
      });
    },
    showPreviewWidget(tile: TileData) {
      dispatch({
        type: 'tile_selected',
        payload: {
          tileId: tile.metadata.coordId,
          tileData: {
            id: tile.metadata.dbId.toString(),
            title: tile.data.name,
            description: tile.data.description,
        preview: undefined,
            content: tile.data.description,
            coordId: tile.metadata.coordId,
          },
          openInEditMode: false,
        },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'system',
      });
    },
  };
}