import type { ChatEvent, Message, OperationCompletedPayload } from '~/app/map/Chat/_state/_events/event.types';
import type { ChatSettings } from '~/app/map/Chat/_settings/chat-settings';

/**
 * Handle operation completion events for messages
 */
export function handleOperationMessages(event: ChatEvent, messages: Message[], settings: ChatSettings) {
  if (event.type === 'operation_completed') {
    const payload = event.payload as OperationCompletedPayload;
    if (!payload || typeof payload !== 'object' || !('result' in payload) || !('operation' in payload)) {
      return;
    }
    if (payload.result === 'success') {
      const shouldShow = (
        (payload.operation === 'update' && settings.messages.tile.edit) ||
        (payload.operation === 'create' && settings.messages.tile.create) ||
        (payload.operation === 'delete' && settings.messages.tile.delete) ||
        (payload.operation === 'move' && settings.messages.tile.move) ||
        (payload.operation === 'swap' && settings.messages.tile.swap) ||
        (payload.operation === 'copy' && settings.messages.tile.copy) ||
        (!['update', 'create', 'delete', 'move', 'swap', 'copy'].includes(payload.operation))
      );

      if (shouldShow) {
        let content = payload.message;

        if (payload.tileId) {
          if (payload.operation === 'create') {
            const regex = /Created "(.+)"/;
            const match = regex.exec(payload.message);
            if (match?.[1]) {
              const tileName = match[1];
              const truncatedName = tileName.length > 25 ? tileName.slice(0, 25) + '...' : tileName;
              const navigationLink = `[**${truncatedName}**](command:navigate:${payload.tileId}:${encodeURIComponent(tileName)})`;
              content = `Created ${navigationLink}`;
            }
          } else if (payload.operation === 'delete') {
            const regex = /Deleted "(.+)"/;
            const match = regex.exec(payload.message);
            if (match?.[1]) {
              const tileName = match[1];
              const truncatedName = tileName.length > 25 ? tileName.slice(0, 25) + '...' : tileName;
              content = `Deleted **${truncatedName}**`;
            }
          } else if (payload.operation === 'move') {
            const regex = /Moved "(.+)"/;
            const match = regex.exec(payload.message);
            if (match?.[1]) {
              const tileName = match[1];
              const truncatedName = tileName.length > 25 ? tileName.slice(0, 25) + '...' : tileName;
              const navigationLink = `[**${truncatedName}**](command:navigate:${payload.tileId}:${encodeURIComponent(tileName)})`;
              content = `Moved ${navigationLink}`;
            }
          } else if (payload.operation === 'copy') {
            const regex = /Copied "(.+)"/;
            const match = regex.exec(payload.message);
            if (match?.[1]) {
              const tileName = match[1];
              const truncatedName = tileName.length > 25 ? tileName.slice(0, 25) + '...' : tileName;
              const navigationLink = `[**${truncatedName}**](command:navigate:${payload.tileId}:${encodeURIComponent(tileName)})`;
              content = `Copied ${navigationLink}`;
            }
          } else if (payload.operation === 'update') {
            const regex = /Updated "(.+)"/;
            const match = regex.exec(payload.message);
            if (match?.[1]) {
              const tileName = match[1];
              const truncatedName = tileName.length > 25 ? tileName.slice(0, 25) + '...' : tileName;
              const navigationLink = `[**${truncatedName}**](command:navigate:${payload.tileId}:${encodeURIComponent(tileName)})`;
              content = `Updated ${navigationLink}`;
            }
          }
        }

        if (payload.operation === 'swap') {
          const regex = /Swapped "(.+)" with "(.+)"/;
          const match = regex.exec(payload.message);
          if (match?.[1] && match?.[2]) {
            const tile1Name = match[1];
            const tile2Name = match[2];
            const truncated1 = tile1Name.length > 25 ? tile1Name.slice(0, 25) + '...' : tile1Name;
            const truncated2 = tile2Name.length > 25 ? tile2Name.slice(0, 25) + '...' : tile2Name;
            content = `Swapped **${truncated1}** with **${truncated2}**`;
          }
        }

        messages.push({
          id: event.id,
          content,
          actor: 'system',
          timestamp: event.timestamp,
        });
      }
    }
  }
}