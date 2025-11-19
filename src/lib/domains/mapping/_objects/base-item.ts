import {
  GenericAggregate,
  type GenericAggregateConstructorArgs,
} from "~/lib/domains/utils";
import type { MapItemAttributes } from "~/lib/domains/mapping/types/item-attributes";

// Type alias for MapItemAttributes - provides semantic meaning in this domain context
export type Attrs = MapItemAttributes;

export type RelatedItems = Record<string, never>;
export type RelatedLists = Record<string, never>;

export type BaseItemConstructorArgs = GenericAggregateConstructorArgs<
  Partial<Attrs>,
  RelatedItems,
  RelatedLists
>;

export type BaseItemIdr = {
  id: number;
};

const DEFAULT_CENTER_TITLE = "The center of the map";
const DEFAULT_CENTER_DESCRIPTION = "";

export class BaseItem extends GenericAggregate<
  Attrs,
  RelatedItems,
  RelatedLists
> {
  constructor(args: BaseItemConstructorArgs) {
    super({
      ...args,
      attrs: {
        ...args.attrs,
        title: args.attrs?.title ?? DEFAULT_CENTER_TITLE,
        content: args.attrs?.content ?? DEFAULT_CENTER_DESCRIPTION,
        preview: args.attrs?.preview,
        link: args.attrs?.link ?? "",
      },
    });
  }
}

export type BaseItemWithId = BaseItem & { id: number };
