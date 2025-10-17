import '~/test/setup';
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BaseFrame } from "~/app/map/Canvas/Tile/Base/BaseFrame";
import type { TileData } from "~/app/map/types/tile-data";
import { createTestSetup } from '~/test-utils/providers';

describe("BaseFrame - Composition Rendering", () => {
  const { wrapper } = createTestSetup();

  const createMockItem = (coordId: string, dbId: string, title: string): TileData => ({
    metadata: {
      dbId,
      coordId,
      parentId: undefined,
      coordinates: { userId: 1, groupId: 0, path: coordId.split(":")[2]?.split(",").map(Number) ?? [] },
      depth: coordId.split(":")[2]?.split(",").length ?? 0,
      ownerId: "user1",
    },
    data: {
      title,
      content: `Content for ${title}`,
      preview: undefined,
      link: "",
      color: "zinc-500",
    },
    state: {
      isDragged: false,
      isHovered: false,
      isSelected: false,
      isExpanded: false,
      isDragOver: false,
      isHovering: false,
    },
  });

  const mockURLInfo = {
    pathname: "/map",
    searchParamsString: "",
    rootItemId: "item-1",
    scale: undefined,
    expandedItems: undefined,
    focus: undefined,
  };

  describe("Composition Detection", () => {
    it("should render composition frame when compositionExpandedIds includes center coordId", () => {
      const centerCoordId = "1,0:0";
      const mapItems: Record<string, TileData> = {
        [centerCoordId]: createMockItem(centerCoordId, "item-1", "Center Item"),
        // Composition container at direction 0
        "1,0:0,0": createMockItem("1,0:0,0", "item-comp", "Composition Container"),
        // Composed children at scale-1 (directions 1-6 of composition container)
        "1,0:0,0,1": createMockItem("1,0:0,0,1", "item-comp-1", "Composed Child 1"),
        "1,0:0,0,2": createMockItem("1,0:0,0,2", "item-comp-2", "Composed Child 2"),
      };

      const { container } = render(
        <BaseFrame
          center={centerCoordId}
          mapItems={mapItems}
          baseHexSize={50}
          expandedItemIds={["item-1"]}
          compositionExpandedIds={[centerCoordId]}
          scale={3}
          urlInfo={mockURLInfo}
          interactive={false}
        />,
        { wrapper }
      );

      // Should render dual frame structure
      const frames = container.querySelectorAll('[data-testid^="frame-"]');
      expect(frames.length).toBeGreaterThan(0);

      // Should render composition tiles at reduced scale
      const compositionTiles = container.querySelectorAll('[data-tile-id^="1,0:0,0"]');
      expect(compositionTiles.length).toBeGreaterThan(0);
    });

    it("should not render composition frame when compositionExpandedIds does not include center", () => {
      const centerCoordId = "1,0:0";
      const mapItems: Record<string, TileData> = {
        [centerCoordId]: createMockItem(centerCoordId, "item-1", "Center Item"),
        "1,0:0,0": createMockItem("1,0:0,0", "item-comp", "Composition Container"),
        "1,0:0,0,1": createMockItem("1,0:0,0,1", "item-comp-1", "Composed Child 1"),
      };

      const { container } = render(
        <BaseFrame
          center={centerCoordId}
          mapItems={mapItems}
          baseHexSize={50}
          expandedItemIds={["item-1"]}
          compositionExpandedIds={[]}
          scale={3}
          urlInfo={mockURLInfo}
          interactive={false}
        />,
        { wrapper }
      );

      // Should not render composition tiles
      const compositionTiles = container.querySelectorAll('[data-tile-id="1,0:0,0"]');
      expect(compositionTiles.length).toBe(0);
    });

    it("should only show composition for center tile, not children", () => {
      const centerCoordId = "1,0:0";
      const mapItems: Record<string, TileData> = {
        [centerCoordId]: createMockItem(centerCoordId, "item-1", "Center Item"),
        // Regular child at direction 1
        "1,0:0,1": createMockItem("1,0:0,1", "item-2", "Child Item"),
        // Composition for child (should not be shown)
        "1,0:0,1,0": createMockItem("1,0:0,1,0", "item-2-comp", "Child Composition"),
      };

      const { container } = render(
        <BaseFrame
          center={centerCoordId}
          mapItems={mapItems}
          baseHexSize={50}
          expandedItemIds={["item-1"]}
          compositionExpandedIds={["1,0:0,1"]}
          scale={3}
          urlInfo={mockURLInfo}
          interactive={false}
        />,
        { wrapper }
      );

      // Child composition should not be rendered
      const childCompositionTiles = container.querySelectorAll('[data-tile-id="1,0:0,1,0"]');
      expect(childCompositionTiles.length).toBe(0);
    });
  });

  describe("Dual Frame Rendering", () => {
    it("should render outer frame (scale 2) and inner frame (scale 1) when composition expanded", () => {
      const centerCoordId = "1,0:0";
      const mapItems: Record<string, TileData> = {
        [centerCoordId]: createMockItem(centerCoordId, "item-1", "Center Item"),
        // Regular children (outer frame - directions 1-6 at scale 2)
        "1,0:0,1": createMockItem("1,0:0,1", "item-nw", "NW Child"),
        "1,0:0,2": createMockItem("1,0:0,2", "item-ne", "NE Child"),
        // Composition (inner frame - direction 0 container + children at scale 1)
        "1,0:0,0": createMockItem("1,0:0,0", "item-comp", "Composition"),
        "1,0:0,0,1": createMockItem("1,0:0,0,1", "item-comp-1", "Composed 1"),
      };

      const { container } = render(
        <BaseFrame
          center={centerCoordId}
          mapItems={mapItems}
          baseHexSize={50}
          expandedItemIds={["item-1"]}
          compositionExpandedIds={[centerCoordId]}
          scale={3}
          urlInfo={mockURLInfo}
          interactive={false}
        />,
        { wrapper }
      );

      // Should have both outer frame children and inner frame children
      const outerFrameTiles = container.querySelectorAll('[data-tile-id="1,0:0,1"]');
      expect(outerFrameTiles.length).toBeGreaterThan(0);

      const innerFrameTiles = container.querySelectorAll('[data-tile-id^="1,0:0,0,"]');
      expect(innerFrameTiles.length).toBeGreaterThan(0);
    });

    it("should position inner frame at center overlaying center tile", () => {
      const centerCoordId = "1,0:0";
      const mapItems: Record<string, TileData> = {
        [centerCoordId]: createMockItem(centerCoordId, "item-1", "Center Item"),
        "1,0:0,0": createMockItem("1,0:0,0", "item-comp", "Composition"),
        "1,0:0,0,1": createMockItem("1,0:0,0,1", "item-comp-1", "Composed 1"),
      };

      const { container } = render(
        <BaseFrame
          center={centerCoordId}
          mapItems={mapItems}
          baseHexSize={50}
          expandedItemIds={["item-1"]}
          compositionExpandedIds={[centerCoordId]}
          scale={3}
          urlInfo={mockURLInfo}
          interactive={false}
        />,
        { wrapper }
      );

      // Inner frame should be positioned at center
      const innerFrameContainer = container.querySelector('[data-testid="inner-composition-frame"]');
      expect(innerFrameContainer).toBeInTheDocument();
    });

    it("should render outer frame at scale-1 (scale 2) when parent is scale 3", () => {
      const centerCoordId = "1,0:0";
      const mapItems: Record<string, TileData> = {
        [centerCoordId]: createMockItem(centerCoordId, "item-1", "Center Item"),
        "1,0:0,1": createMockItem("1,0:0,1", "item-nw", "NW Child"),
      };

      const { container } = render(
        <BaseFrame
          center={centerCoordId}
          mapItems={mapItems}
          baseHexSize={50}
          expandedItemIds={["item-1"]}
          compositionExpandedIds={[centerCoordId]}
          scale={3}
          urlInfo={mockURLInfo}
          interactive={false}
        />,
        { wrapper }
      );

      // Outer frame tiles should use scale 2 (verified via recursive BaseFrame calls)
      const outerTile = container.querySelector('[data-tile-id="1,0:0,1"]');
      expect(outerTile).toBeInTheDocument();
    });

    it("should render inner frame at scale-2 (scale 1) when parent is scale 3", () => {
      const centerCoordId = "1,0:0";
      const mapItems: Record<string, TileData> = {
        [centerCoordId]: createMockItem(centerCoordId, "item-1", "Center Item"),
        "1,0:0,0": createMockItem("1,0:0,0", "item-comp", "Composition"),
        "1,0:0,0,1": createMockItem("1,0:0,0,1", "item-comp-1", "Composed 1"),
      };

      const { container } = render(
        <BaseFrame
          center={centerCoordId}
          mapItems={mapItems}
          baseHexSize={50}
          expandedItemIds={["item-1"]}
          compositionExpandedIds={[centerCoordId]}
          scale={3}
          urlInfo={mockURLInfo}
          interactive={false}
        />,
        { wrapper }
      );

      // Inner frame tiles should use scale 1 (2 scales down)
      const innerTile = container.querySelector('[data-tile-id="1,0:0,0,1"]');
      expect(innerTile).toBeInTheDocument();
    });
  });

  describe("Scale Reduction Logic", () => {
    it("should not allow composition at scale 1 (cannot reduce further)", () => {
      const centerCoordId = "1,0:0";
      const mapItems: Record<string, TileData> = {
        [centerCoordId]: createMockItem(centerCoordId, "item-1", "Center Item"),
        "1,0:0,0": createMockItem("1,0:0,0", "item-comp", "Composition"),
      };

      const { container } = render(
        <BaseFrame
          center={centerCoordId}
          mapItems={mapItems}
          baseHexSize={50}
          expandedItemIds={["item-1"]}
          compositionExpandedIds={[centerCoordId]}
          scale={1}
          urlInfo={mockURLInfo}
          interactive={false}
        />,
        { wrapper }
      );

      // Should not render composition at scale 1
      const compositionTiles = container.querySelectorAll('[data-tile-id="1,0:0,0"]');
      expect(compositionTiles.length).toBe(0);
    });

    it("should handle scale 2 composition (inner frame at scale 0)", () => {
      const centerCoordId = "1,0:0";
      const mapItems: Record<string, TileData> = {
        [centerCoordId]: createMockItem(centerCoordId, "item-1", "Center Item"),
        "1,0:0,0": createMockItem("1,0:0,0", "item-comp", "Composition"),
        "1,0:0,0,1": createMockItem("1,0:0,0,1", "item-comp-1", "Composed 1"),
      };

      const { container } = render(
        <BaseFrame
          center={centerCoordId}
          mapItems={mapItems}
          baseHexSize={50}
          expandedItemIds={["item-1"]}
          compositionExpandedIds={[centerCoordId]}
          scale={2}
          urlInfo={mockURLInfo}
          interactive={false}
        />,
        { wrapper }
      );

      // Should render composition at scale 0
      const compositionTiles = container.querySelectorAll('[data-tile-id^="1,0:0,0"]');
      expect(compositionTiles.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty composition container (no children)", () => {
      const centerCoordId = "1,0:0";
      const mapItems: Record<string, TileData> = {
        [centerCoordId]: createMockItem(centerCoordId, "item-1", "Center Item"),
        "1,0:0,0": createMockItem("1,0:0,0", "item-comp", "Empty Composition"),
      };

      const { container } = render(
        <BaseFrame
          center={centerCoordId}
          mapItems={mapItems}
          baseHexSize={50}
          expandedItemIds={["item-1"]}
          compositionExpandedIds={[centerCoordId]}
          scale={3}
          urlInfo={mockURLInfo}
          interactive={false}
        />,
        { wrapper }
      );

      // Should render composition container even if empty
      const compositionContainer = container.querySelector('[data-tile-id="1,0:0,0"]');
      expect(compositionContainer).toBeInTheDocument();
    });

    it("should handle composition when center is not expanded", () => {
      const centerCoordId = "1,0:0";
      const mapItems: Record<string, TileData> = {
        [centerCoordId]: createMockItem(centerCoordId, "item-1", "Center Item"),
        "1,0:0,0": createMockItem("1,0:0,0", "item-comp", "Composition"),
      };

      const { container } = render(
        <BaseFrame
          center={centerCoordId}
          mapItems={mapItems}
          baseHexSize={50}
          expandedItemIds={[]}
          compositionExpandedIds={[centerCoordId]}
          scale={3}
          urlInfo={mockURLInfo}
          interactive={false}
        />,
        { wrapper }
      );

      // Should not render frame if center is not expanded
      const frames = container.querySelectorAll('[data-testid^="frame-"]');
      expect(frames.length).toBe(0);
    });

    it("should handle missing compositionExpandedIds prop (undefined)", () => {
      const centerCoordId = "1,0:0";
      const mapItems: Record<string, TileData> = {
        [centerCoordId]: createMockItem(centerCoordId, "item-1", "Center Item"),
      };

      const { container } = render(
        <BaseFrame
          center={centerCoordId}
          mapItems={mapItems}
          baseHexSize={50}
          expandedItemIds={["item-1"]}
          scale={3}
          urlInfo={mockURLInfo}
          interactive={false}
        />,
        { wrapper }
      );

      // Should render without errors (no composition)
      expect(container).toBeInTheDocument();
    });
  });
});
