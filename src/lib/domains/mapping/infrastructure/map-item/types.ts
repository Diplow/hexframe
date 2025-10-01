import type { MapItemType } from "~/lib/domains/mapping/_objects/map-item";

// Infer DB types
export type DbMapItemSelect = {
  id: number;
  originId: number | null;
  parentId: number | null;
  coord_user_id: number;
  coord_group_id: number;
  path: string;
  item_type: MapItemType;
  refItemId: number;
};

export type DbBaseItemSelect = {
  id: number;
  title: string;
  content: string;
  preview: string | null;
  link: string | null;
};

// Joined result type
export type DbMapItemWithBase = {
  map_items: DbMapItemSelect;
  base_items: DbBaseItemSelect;
};

export type CreateMapItemDbAttrs = {
  originId: number | null;
  parentId: number | null;
  coord_user_id: number;
  coord_group_id: number;
  path: string;
  item_type: MapItemType;
  refItemId: number;
};

export type UpdateMapItemDbAttrs = Partial<{
  originId: number | null;
  parentId: number | null;
  coord_user_id: number;
  coord_group_id: number;
  path: string;
  item_type: MapItemType;
  refItemId: number;
}>;
