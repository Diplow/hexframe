import type { Widget, TileSelectedPayload } from '~/app/map/Chat/_state';
import type { TileData } from '~/app/map/types';
import { TileWidget } from '~/app/map/Chat/Timeline/Widgets';
import type { WidgetHandlers } from '~/app/map/Chat/Timeline/_components/_renderers/widget-renderers';

export function _renderTileWidget(
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
      coordId={tileItem?.metadata?.coordId ?? tileData.tileId}
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

export function _renderCreationWidget(widget: Widget, handlers: WidgetHandlers) {
  const creationData = widget.data as { coordId?: string; parentName?: string; parentCoordId?: string; parentId?: string };
  const { handleSave = () => { /* noop */ }, handleCancel = () => { /* noop */ } } = handlers;

  return (
    <TileWidget
      mode="create"
      coordId={creationData.coordId ?? ''}
      parentName={creationData.parentName}
      parentCoordId={creationData.parentCoordId}
      onSave={handleSave}
      onClose={handleCancel}
    />
  );
}

export function _renderDeleteWidget(widget: Widget, handlers: WidgetHandlers) {
  const deleteData = widget.data as { tileId?: string; tileName?: string; tile?: { id: string; title: string; coordId: string } };
  const { handleCancel = () => { /* noop */ } } = handlers;

  const tileCoordId = deleteData.tile?.coordId ?? deleteData.tileId ?? '';
  const tileName = deleteData.tileName ?? deleteData.tile?.title ?? 'item';

  return (
    <TileWidget
      mode="delete"
      tileId={tileCoordId}
      coordId={tileCoordId}
      title={tileName}
      onClose={handleCancel}
    />
  );
}
