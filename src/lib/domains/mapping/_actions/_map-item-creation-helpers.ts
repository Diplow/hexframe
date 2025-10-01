import type {
  BaseItemRepository,
  MapItemRepository,
} from "~/lib/domains/mapping/_repositories";
import {
  BaseItem,
  type BaseItemAttrs,
  type BaseItemWithId,
  MapItem,
  type MapItemWithId,
  MapItemType,
} from "~/lib/domains/mapping/_objects";
import { type Coord } from "~/lib/domains/mapping/utils";

export class MapItemCreationHelpers {
  constructor(
    private readonly mapItems: MapItemRepository,
    private readonly baseItems: BaseItemRepository,
  ) {}

  async createMapItem({
    itemType,
    coords,
    title,
    content,
    preview,
    link,
    parentId,
  }: {
    itemType: MapItemType;
    coords: Coord;
    title?: string;
    content?: string;
    preview?: string;
    link?: string;
    parentId?: number;
  }): Promise<MapItemWithId> {
    const parent = await this._validateAndGetParent(itemType, parentId);
    this._validateItemTypeConstraints(itemType, parent, coords);

    const ref = await this._createReference(title, content, preview, link);
    const mapItem = this._buildMapItem(itemType, coords, parent, ref);
    const result = await this.mapItems.create(mapItem);
    return result;
  }

  async updateRef(ref: BaseItemWithId, attrs: Partial<BaseItemAttrs>) {
    console.log('🟩 Creation helpers - updateRef called with:', { refId: ref.id, attrs });
    const result = await this.baseItems.update({
      aggregate: ref,
      attrs,
    });
    console.log('🟩 Creation helpers - Repository returned:', { id: result.id, title: result.attrs.title, preview: result.attrs.preview });
    return result;
  }

  private async _validateAndGetParent(
    itemType: MapItemType,
    parentId?: number,
  ): Promise<MapItemWithId | null> {
    if (!parentId) {
      return null;
    }

    const parent = await this.mapItems.getOne(parentId);
    if (!parent) {
      throw new Error(`Parent MapItem with id ${parentId} not found.`);
    }

    return parent;
  }

  private _validateItemTypeConstraints(
    itemType: MapItemType,
    parent: MapItemWithId | null,
    coords: Coord,
  ) {
    if (itemType === MapItemType.USER) {
      if (parent) {
        throw new Error("USER type item cannot have a parentId.");
      }
    } else {
      if (!parent) {
        throw new Error("BASE type item must have a parent.");
      }
      if (
        coords.userId !== parent.attrs.coords.userId ||
        coords.groupId !== parent.attrs.coords.groupId
      ) {
        throw new Error("Child item's userId and groupId must match parent's.");
      }
    }
  }

  private async _createReference(
    title?: string,
    content?: string,
    preview?: string,
    link?: string,
  ): Promise<BaseItemWithId> {
    const baseItem = new BaseItem({ attrs: { title, content, preview, link } });
    return await this.baseItems.create(baseItem);
  }

  private _buildMapItem(
    itemType: MapItemType,
    coords: Coord,
    parent: MapItemWithId | null,
    ref: BaseItemWithId,
  ): MapItem {
    return new MapItem({
      attrs: {
        itemType,
        coords,
        parentId: parent?.id ?? null,
        originId: null,
        ref: { itemType: MapItemType.BASE, itemId: ref.id },
      },
      ref,
      parent,
    });
  }
}
