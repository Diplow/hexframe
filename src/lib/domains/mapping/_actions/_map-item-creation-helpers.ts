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
import { type HexCoord } from "~/lib/domains/mapping/utils/hex-coordinates";

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
    url,
    parentId,
  }: {
    itemType: MapItemType;
    coords: HexCoord;
    title?: string;
    descr?: string;
    url?: string;
    parentId?: number;
  }): Promise<MapItemWithId> {
    const parent = await this._validateAndGetParent(itemType, parentId);
    this._validateItemTypeConstraints(itemType, parent, coords);

    const ref = await this._createReference(title, descr, url);
    const mapItem = this._buildMapItem(itemType, coords, parent, ref);

    return await this.mapItems.create(mapItem);
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
    coords: HexCoord,
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
    url?: string,
  ): Promise<BaseItemWithId> {
    const baseItem = new BaseItem({ attrs: { title, descr, link: url } });
    return await this.baseItems.create(baseItem);
  }

  private _buildMapItem(
    itemType: MapItemType,
    coords: HexCoord,
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
