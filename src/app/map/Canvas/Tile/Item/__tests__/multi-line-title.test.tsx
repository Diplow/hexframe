import '~/test/setup'; // Import test setup FIRST
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DynamicTileContent } from "~/app/map/Canvas/Tile/Item/content";

describe("DynamicTileContent Multi-line Title", () => {
  it("should allow multi-line title with line-clamp-4 for scale 1 tiles", () => {
    const longTitle = "This is a very long title that should display on multiple lines up to 4 lines for scale 1";

    render(
      <DynamicTileContent
        data={{ title: longTitle }}
        scale={1}
        tileId="test-tile"
      />
    );

    const titleElement = screen.getByText(longTitle);
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveClass("line-clamp-4");
    expect(titleElement).toHaveClass("break-words");
    expect(titleElement).not.toHaveClass("truncate");
  });
  
  it("should apply break-words class for scales 2 and 3", () => {
    const scales = [2, 3] as const;
    const title = "Another long title that needs multiple lines to display properly";
    
    scales.forEach((scale) => {
      const { rerender } = render(
        <DynamicTileContent
          data={{ title }}
          scale={scale}
          tileId={`test-tile-scale-${scale}`}
        />
      );
      
      const titleElement = screen.getByText(title);
      expect(titleElement).toHaveClass("break-words");
      expect(titleElement).not.toHaveClass("truncate");
      
      rerender(<div />); // Clean up between iterations
    });
  });
});