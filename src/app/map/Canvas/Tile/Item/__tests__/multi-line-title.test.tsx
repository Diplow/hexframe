import '~/test/setup'; // Import test setup FIRST
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DynamicTileContent } from "~/app/map/Canvas/Tile/Item/content";

describe("DynamicTileContent Multi-line Title", () => {
  it("should truncate title for scale 1 tiles", () => {
    const longTitle = "This is a very long title that should be truncated with ellipsis for scale 1";
    
    render(
      <DynamicTileContent
        data={{ title: longTitle }}
        scale={1}
        tileId="test-tile"
      />
    );
    
    const titleElement = screen.getByText(longTitle);
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveClass("truncate");
    expect(titleElement).not.toHaveClass("break-words");
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