/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { DynamicTileContent } from "../content";

// Mock the getTextColorForDepth function to verify it's being called
vi.mock("~/app/map/types/theme-colors", () => ({
  getTextColorForDepth: vi.fn((depth: number) => {
    if (depth >= 5) {
      return "text-white dark:text-gray-900";
    }
    return "text-gray-900 dark:text-gray-100";
  }),
}));

describe.skip("DynamicTileContent - Depth-based Text Colors", () => {
  it("should apply text color based on depth for title", () => {
    const { container } = render(
      <DynamicTileContent
        data={{
          title: "Test Title",
          description: "Test Description",
        }}
        scale={2}
        depth={3}
      />
    );

    // Check that title has the correct text color class
    const titleElement = container.querySelector('[data-testid*="tile-title"]');
    expect(titleElement?.className).toContain("text-gray-900");
    expect(titleElement?.className).toContain("dark:text-gray-100");
  });

  it("should apply inverted text color for deep tiles (depth >= 5)", () => {
    const { container } = render(
      <DynamicTileContent
        data={{
          title: "Deep Title",
          description: "Deep Description",
        }}
        scale={2}
        depth={6}
      />
    );

    // Check that title has inverted text color class for deep tiles
    const titleElement = container.querySelector('[data-testid*="tile-title"]');
    expect(titleElement?.className).toContain("text-white");
    expect(titleElement?.className).toContain("dark:text-gray-900");
  });

  it("should apply text color to description section", () => {
    const { container } = render(
      <DynamicTileContent
        data={{
          title: "Title",
          description: "# Markdown Description\n\nWith some content",
        }}
        scale={3}
        depth={2}
      />
    );

    // Find the description section by its prose classes
    const descriptionSection = container.querySelector('.prose');
    expect(descriptionSection?.className).toContain("text-gray-900");
    expect(descriptionSection?.className).toContain("dark:text-gray-100");
  });

  it("should apply text color to URL section", () => {
    const { container } = render(
      <DynamicTileContent
        data={{
          title: "Title",
          url: "https://example.com",
        }}
        scale={3}
        depth={7}
      />
    );

    // Find the URL container (last child with text classes)
    const urlSection = container.querySelector('div.text-white');
    expect(urlSection).toBeTruthy();
    expect(urlSection?.className).toContain("text-white");
    expect(urlSection?.className).toContain("dark:text-gray-900");
  });

  it("should default to depth 0 when depth prop is not provided", () => {
    const { container } = render(
      <DynamicTileContent
        data={{
          title: "No Depth Title",
        }}
        scale={1}
      />
    );

    // Should use default shallow depth text colors
    const titleElement = container.querySelector('[data-testid*="tile-title"]');
    expect(titleElement?.className).toContain("text-gray-900");
    expect(titleElement?.className).toContain("dark:text-gray-100");
  });
});