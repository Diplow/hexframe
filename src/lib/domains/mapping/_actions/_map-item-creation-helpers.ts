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
    descr,
    preview,
    url,
    parentId,
  }: {
    itemType: MapItemType;
    coords: Coord;
    title?: string;
    descr?: string;
    preview?: string;
    url?: string;
    parentId?: number;
  }): Promise<MapItemWithId> {
    const parent = await this._validateAndGetParent(itemType, parentId);
    this._validateItemTypeConstraints(itemType, parent, coords);

    console.log("[PREVIEW DEBUG] CreationHelpers about to create reference with preview:", preview);
    const ref = await this._createReference(title, descr, preview, url);
    console.log("[PREVIEW DEBUG] CreationHelpers created reference with preview:", ref.attrs.preview);
    const mapItem = this._buildMapItem(itemType, coords, parent, ref);
    console.log("[PREVIEW DEBUG] CreationHelpers built mapItem with ref preview:", mapItem.ref.attrs.preview);

    const result = await this.mapItems.create(mapItem);
    console.log("[PREVIEW DEBUG] CreationHelpers mapItems.create result preview:", result.ref.attrs.preview);
    return result;
  }

  async updateRef(ref: BaseItemWithId, attrs: Partial<BaseItemAttrs>) {
    return await this.baseItems.update({
      aggregate: ref,
      attrs,
    });
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
    descr?: string,
    preview?: string,
    url?: string,
  ): Promise<BaseItemWithId> {
    console.log("[PREVIEW DEBUG] _createReference called with preview:", preview);
    const baseItem = new BaseItem({ attrs: { title, descr, preview, link: url } });
    console.log("[PREVIEW DEBUG] BaseItem created with preview attr:", baseItem.attrs.preview);
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
