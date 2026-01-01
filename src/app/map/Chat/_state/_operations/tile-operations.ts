import type { ChatEvent } from '~/app/map/Chat/_state/_events';
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
            title: tile.data.title,
            content: tile.data.content,
            preview: tile.data.preview,
            coordId: tile.metadata.coordId,
          },
          openInEditMode: true,
        },
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        actor: 'system',
      });
    },
    showTileWidget(tile: TileData) {
      dispatch({
        type: 'tile_selected',
        payload: {
          tileId: tile.metadata.coordId,
          tileData: {
            id: tile.metadata.dbId.toString(),
            title: tile.data.title,
            content: tile.data.content,
            preview: tile.data.preview,
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