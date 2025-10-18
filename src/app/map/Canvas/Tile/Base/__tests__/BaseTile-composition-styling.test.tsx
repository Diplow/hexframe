import '~/test/setup';
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BaseItemTile } from "~/app/map/Canvas/Tile/Base/_components/BaseItemTile";
import type { TileData } from "~/app/map/types/tile-data";
import { createTestSetup } from '~/test-utils/providers';

describe("BaseTile - Composition Styling", () => {
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

  describe("Dashed Borders", () => {
    it("should apply dashed border when isComposed=true", () => {
      const item = createMockItem("1,0:0,0,1", "comp-1", "Composed Child");

      const { container } = render(
        <BaseItemTile
          item={item}
          scale={1}
          baseHexSize={50}
          isComposed={true}
        />,
        { wrapper }
      );

      // SVG path should have dashed stroke
      const svgPath = container.querySelector("svg path");
      expect(svgPath).toHaveAttribute("stroke-dasharray");
    });

    it("should NOT apply dashed border when isComposed=false", () => {
      const item = createMockItem("1,0:0,1", "regular-1", "Regular Child");

      const { container } = render(
        <BaseItemTile
          item={item}
          scale={1}
          baseHexSize={50}
          isComposed={false}
        />,
        { wrapper }
      );

      // SVG path should NOT have dashed stroke
      const svgPath = container.querySelector("svg path");
      expect(svgPath).not.toHaveAttribute("stroke-dasharray");
    });

    it("should NOT apply dashed border when isComposed is undefined", () => {
      const item = createMockItem("1,0:0,1", "regular-1", "Regular Child");

      const { container } = render(
        <BaseItemTile
          item={item}
          scale={1}
          baseHexSize={50}
        />,
        { wrapper }
      );

      // SVG path should NOT have dashed stroke by default
      const svgPath = container.querySelector("svg path");
      expect(svgPath).not.toHaveAttribute("stroke-dasharray");
    });
  });

  describe("Opacity Styling", () => {
    it("should apply 80% opacity when isComposed=true", () => {
      const item = createMockItem("1,0:0,0,1", "comp-1", "Composed Child");

      const { container } = render(
        <BaseItemTile
          item={item}
          scale={1}
          baseHexSize={50}
          isComposed={true}
        />,
        { wrapper }
      );

      // Tile content should have opacity-80 class
      const tileContent = container.querySelector('[data-testid="tile-content"]');
      expect(tileContent).toHaveClass("opacity-80");
    });

    it("should NOT apply reduced opacity when isComposed=false", () => {
      const item = createMockItem("1,0:0,1", "regular-1", "Regular Child");

      const { container } = render(
        <BaseItemTile
          item={item}
          scale={1}
          baseHexSize={50}
          isComposed={false}
        />,
        { wrapper }
      );

      // Tile content should NOT have opacity-80 class
      const tileContent = container.querySelector('[data-testid="tile-content"]');
      expect(tileContent).not.toHaveClass("opacity-80");
    });

    it("should use full opacity when isComposed is undefined", () => {
      const item = createMockItem("1,0:0,1", "regular-1", "Regular Child");

      const { container } = render(
        <BaseItemTile
          item={item}
          scale={1}
          baseHexSize={50}
        />,
        { wrapper }
      );

      // Tile content should use default opacity (no opacity-80)
      const tileContent = container.querySelector('[data-testid="tile-content"]');
      expect(tileContent).not.toHaveClass("opacity-80");
    });
  });

  describe("Combined Styling", () => {
    it("should apply both dashed border and opacity when isComposed=true", () => {
      const item = createMockItem("1,0:0,0,1", "comp-1", "Composed Child");

      const { container } = render(
        <BaseItemTile
          item={item}
          scale={1}
          baseHexSize={50}
          isComposed={true}
        />,
        { wrapper }
      );

      // Should have both styles
      const svgPath = container.querySelector("svg path");
      expect(svgPath).toHaveAttribute("stroke-dasharray");

      const tileContent = container.querySelector('[data-testid="tile-content"]');
      expect(tileContent).toHaveClass("opacity-80");
    });

    it("should not affect other styling when isComposed=true", () => {
      const item = createMockItem("1,0:0,0,1", "comp-1", "Composed Child");

      const { container } = render(
        <BaseItemTile
          item={item}
          scale={2}
          baseHexSize={50}
          isComposed={true}
          isSelected={true}
        />,
        { wrapper }
      );

      // Should preserve selection styling
      const tileContent = container.querySelector('[data-testid="tile-content"]');
      expect(tileContent).toHaveClass("ring-2");
      expect(tileContent).toHaveClass("ring-primary");

      // Should also have composition styling
      expect(tileContent).toHaveClass("opacity-80");
    });
  });

  describe("Prop Threading Through Hierarchy", () => {
    it("should accept isComposed prop without errors", () => {
      const item = createMockItem("1,0:0,0,1", "comp-1", "Composed Child");

      // Should not throw
      expect(() => {
        render(
          <BaseItemTile
            item={item}
            scale={1}
            baseHexSize={50}
            isComposed={true}
          />,
          { wrapper }
        );
      }).not.toThrow();
    });

    it("should work with all scale values when isComposed=true", () => {
      const item = createMockItem("1,0:0,0,1", "comp-1", "Composed Child");

      [0, 1, 2, 3].forEach(scale => {
        const { container } = render(
          <BaseItemTile
            item={item}
            scale={scale as 0 | 1 | 2 | 3}
            baseHexSize={50}
            isComposed={true}
          />,
          { wrapper }
        );

        const svgPath = container.querySelector("svg path");
        expect(svgPath).toHaveAttribute("stroke-dasharray");
      });
    });
  });
});
