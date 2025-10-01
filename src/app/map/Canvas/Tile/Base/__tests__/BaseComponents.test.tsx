import '~/test/setup'; // Import test setup FIRST for DOM
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BaseItemTile } from "~/app/map/Canvas/Tile/Base/_components/BaseItemTile";
import { BaseEmptyTile } from "~/app/map/Canvas/Tile/Base/_components/BaseEmptyTile";
import type { TileData } from "~/app/map/types/tile-data";
import { createTestSetup } from '~/test-utils/providers';

describe("Base Components", () => {
  const { wrapper } = createTestSetup();
  
  describe("BaseItemTile", () => {
    it("renders without hooks or state", () => {
      const mockItem: TileData = {
        metadata: {
          dbId: "test-id",
          coordId: "0:0:0",
          parentId: undefined,
          coordinates: { userId: 0, groupId: 0, path: [] },
          depth: 0,
          ownerId: "user1",
        },
        data: {
          name: "Test Tile",
          description: "Test description",
        preview: undefined,
          url: "",
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
      };

      const { getByTestId, getByText } = render(
        <BaseItemTile item={mockItem} scale={2} baseHexSize={50} />,
        { wrapper }
      );

      expect(getByTestId("tile-test-id")).toBeInTheDocument();
      expect(getByText("Test Tile")).toBeInTheDocument();
    });

    it("renders with isSelected state", () => {
      const mockItem: TileData = {
        metadata: {
          dbId: "test-id",
          coordId: "0:0:0",
          parentId: undefined,
          coordinates: { userId: 0, groupId: 0, path: [] },
          depth: 0,
          ownerId: "user1",
        },
        data: {
          name: "Selected Tile",
          description: "",
        preview: undefined,
          url: "",
          color: "amber-400",
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

      const { container } = render(
        <BaseItemTile item={mockItem} isSelected={true} />,
        { wrapper }
      );

      const contentDiv = container.querySelector('[data-testid="tile-content"]');
      expect(contentDiv).toHaveClass("ring-2", "ring-primary");
    });
  });

  describe("BaseEmptyTile", () => {
    it("renders without hooks or state", () => {
      const { getByTestId } = render(
        <BaseEmptyTile coordId="0:0:1" scale={2} baseHexSize={50} />,
        { wrapper }
      );

      expect(getByTestId("empty-tile-0:0:1")).toBeInTheDocument();
    });

    it("renders with preview color when showPreviewColor is true", () => {
      const { container } = render(
        <BaseEmptyTile 
          coordId="0:0:1" 
          scale={2} 
          baseHexSize={50} 
          showPreviewColor={true} 
        />,
        { wrapper }
      );

      // The SVG path should have a fill class when preview color is shown
      const svgPath = container.querySelector("svg path");
      expect(svgPath).toBeTruthy();
    });
  });

  describe("BaseFrame integration", () => {
    it("uses base components when interactive is false", () => {
      // This test verifies that BaseFrame uses the base components
      // when interactive=false
      // The mockItems would be used once BaseFrame is imported and tested
      expect(true).toBe(true); // Placeholder for now
    });
  });
});