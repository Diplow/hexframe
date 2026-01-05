import type { MapItemType, Visibility } from "~/lib/domains/mapping/_objects/map-item";

// Infer DB types
export type DbMapItemSelect = {
  id: number;
  parentId: number | null;
  coord_user_id: string;
  coord_group_id: number;
  path: string;
  item_type: MapItemType;
  visibility: Visibility;
  refItemId: number;
  templateName: string | null;
};

export type DbBaseItemSelect = {
  id: number;
  title: string;
  content: string;
  preview: string | null;
  link: string | null;
  originId: number | null;
};

// Joined result type
export type DbMapItemWithBase = {
  map_items: DbMapItemSelect;
  base_items: DbBaseItemSelect;
};

export type CreateMapItemDbAttrs = {
  parentId: number | null;
  coord_user_id: string;
  coord_group_id: number;
  path: string;
  item_type: MapItemType;
  visibility?: Visibility;
  refItemId: number;
  templateName?: string | null;
};

export type UpdateMapItemDbAttrs = Partial<{
  parentId: number | null;
  coord_user_id: string;
  coord_group_id: number;
  path: string;
  item_type: MapItemType;
  visibility: Visibility;
  refItemId: number;
  templateName: string | null;
}>;
