import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StaticTileContent } from "../content";

describe("StaticTileContent Multi-line Title", () => {
  it("should display full title without truncation", () => {
    const longTitle = "This is a very long title that should wrap to multiple lines instead of being truncated with ellipsis";
    
    render(
      <StaticTileContent
        data={{ title: longTitle }}
        scale={1}
        tileId="test-tile"
      />
    );
    
    const titleElement = screen.getByTestId("tile-title-test-tile");
    expect(titleElement).toHaveTextContent(longTitle);
    expect(titleElement).toHaveClass("break-words");
  });
  
  it("should apply break-words class for all scales", () => {
    const scales = [1, 2, 3] as const;
    const title = "Another long title that needs multiple lines to display properly";
    
    scales.forEach((scale) => {
      const { rerender } = render(
        <StaticTileContent
          data={{ title }}
          scale={scale}
          tileId={`test-tile-scale-${scale}`}
        />
      );
      
      const titleElement = screen.getByTestId(`tile-title-test-tile-scale-${scale}`);
      expect(titleElement).toHaveClass("break-words");
      
      rerender(<div />); // Clean up between iterations
    });
  });
});