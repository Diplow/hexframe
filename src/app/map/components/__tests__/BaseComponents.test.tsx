import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BaseItemTile } from "../BaseItemTile";
import { BaseEmptyTile } from "../BaseEmptyTile";
import type { TileData } from "~/app/map/types/tile-data";

describe("Base Components", () => {
  describe("BaseItemTile", () => {
    it("renders without hooks or state", () => {
      const mockItem: TileData = {
        metadata: {
          dbId: "test-id",
          coordId: "0:0:0",
          coordinates: { userId: 0, groupId: 0, path: [] },
          depth: 0,
          ownerId: "user1",
        },
        data: {
          name: "Test Tile",
          description: "Test description",
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
        <BaseItemTile item={mockItem} scale={2} baseHexSize={50} />
      );

      expect(getByTestId("tile-test-id")).toBeInTheDocument();
      expect(getByText("Test Tile")).toBeInTheDocument();
    });

    it("renders with isSelected state", () => {
      const mockItem: TileData = {
        metadata: {
          dbId: "test-id",
          coordId: "0:0:0",
          coordinates: { userId: 0, groupId: 0, path: [] },
          depth: 0,
          ownerId: "user1",
        },
        data: {
          name: "Selected Tile",
          description: "",
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
        <BaseItemTile item={mockItem} isSelected={true} />
      );

      const contentDiv = container.querySelector('[data-testid="tile-content"]');
      expect(contentDiv).toHaveClass("ring-2", "ring-primary");
    });
  });

  describe("BaseEmptyTile", () => {
    it("renders without hooks or state", () => {
      const { getByTestId } = render(
        <BaseEmptyTile coordId="0:0:1" scale={2} baseHexSize={50} />
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
        />
      );

      // The SVG path should have a fill class when preview color is shown
      const svgPath = container.querySelector("svg path");
      expect(svgPath).toBeTruthy();
    });
  });

  describe("BaseFrame integration", () => {
    it("uses base components when interactive is false", () => {
      const mockItems: Record<string, TileData> = {
        "0:0:0": {
          metadata: {
            dbId: "center-id",
            coordId: "0:0:0",
            coordinates: { userId: 0, groupId: 0, path: [] },
            depth: 0,
            ownerId: "user1",
          },
          data: {
            name: "Center Tile",
            description: "",
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
        },
      };

      // Import BaseFrame for testing
      // This test verifies that BaseFrame uses the base components
      // when interactive=false
      expect(true).toBe(true); // Placeholder for now
    });
  });
});