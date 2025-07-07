import type { Meta, StoryObj } from '@storybook/react';
import { BaseItemTile } from './BaseItemTile';
import { BaseEmptyTile } from './BaseEmptyTile';
import { BaseFrame } from './BaseFrame';
import type { TileData } from '~/app/map/types/tile-data';

const mockItem: TileData = {
  metadata: {
    dbId: "story-item-1",
    coordId: "0:0:0",
    coordinates: { userId: 0, groupId: 0, path: [] },
    depth: 0,
    ownerId: "user1",
  },
  data: {
    name: "Example Tile",
    description: "This is a base tile without any interactivity",
    url: "",
    color: "amber-500",
  },
  state: {
    isDragged: false,
    isHovered: false,
    isSelected: false,
    isExpanded: false,
    isDragOver: false,
    isHovering: false,
  },
};

const mockMapItems: Record<string, TileData> = {
  "0:0:0": {
    ...mockItem,
    data: { ...mockItem.data, name: "Center Tile", color: "zinc-500" }
  },
  "0:0:0:NW": {
    ...mockItem,
    metadata: {
      ...mockItem.metadata,
      dbId: "nw-tile",
      coordId: "0:0:0:NW",
      coordinates: { userId: 0, groupId: 0, path: ["NW"] },
      depth: 1,
    },
    data: { ...mockItem.data, name: "Northwest", color: "amber-400" }
  },
  "0:0:0:NE": {
    ...mockItem,
    metadata: {
      ...mockItem.metadata,
      dbId: "ne-tile",
      coordId: "0:0:0:NE",
      coordinates: { userId: 0, groupId: 0, path: ["NE"] },
      depth: 1,
    },
    data: { ...mockItem.data, name: "Northeast", color: "green-400" }
  },
};

export default {
  title: 'Map/Components/Base Components',
} as Meta;

export const ItemTile: StoryObj<typeof BaseItemTile> = {
  render: () => (
    <div className="flex gap-4 p-8 bg-gray-100 dark:bg-gray-900">
      <BaseItemTile item={mockItem} scale={1} />
      <BaseItemTile item={mockItem} scale={2} />
      <BaseItemTile item={mockItem} scale={3} />
    </div>
  ),
};

export const ItemTileSelected: StoryObj<typeof BaseItemTile> = {
  render: () => (
    <div className="flex gap-4 p-8 bg-gray-100 dark:bg-gray-900">
      <BaseItemTile item={mockItem} scale={2} isSelected={true} />
    </div>
  ),
};

export const EmptyTile: StoryObj<typeof BaseEmptyTile> = {
  render: () => (
    <div className="flex gap-4 p-8 bg-gray-100 dark:bg-gray-900">
      <BaseEmptyTile coordId="0:0:1" scale={1} />
      <BaseEmptyTile coordId="0:0:2" scale={2} />
      <BaseEmptyTile coordId="0:0:3" scale={3} />
    </div>
  ),
};

export const EmptyTileWithPreview: StoryObj<typeof BaseEmptyTile> = {
  render: () => (
    <div className="flex gap-4 p-8 bg-gray-100 dark:bg-gray-900">
      <BaseEmptyTile coordId="0:0:0:NW" scale={2} showPreviewColor={true} />
      <BaseEmptyTile coordId="0:0:0:E" scale={2} showPreviewColor={true} />
    </div>
  ),
};

export const FrameNonInteractive: StoryObj<typeof BaseFrame> = {
  render: () => (
    <div className="p-8 bg-gray-100 dark:bg-gray-900">
      <BaseFrame
        center="0:0:0"
        mapItems={mockMapItems}
        expandedItemIds={["story-item-1"]}
        scale={3}
        urlInfo={{
          rootItemId: "story-item-1",
          rootCoordId: "0:0:0",
          expandedItems: ["story-item-1"],
        }}
        interactive={false}
      />
    </div>
  ),
};

export const FrameCollapsed: StoryObj<typeof BaseFrame> = {
  render: () => (
    <div className="p-8 bg-gray-100 dark:bg-gray-900">
      <BaseFrame
        center="0:0:0"
        mapItems={mockMapItems}
        expandedItemIds={[]}
        scale={3}
        urlInfo={{
          rootItemId: "story-item-1",
          rootCoordId: "0:0:0",
          expandedItems: [],
        }}
        interactive={false}
      />
    </div>
  ),
};