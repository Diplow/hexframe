import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DynamicTileContent } from "../content";

describe("DynamicTileContent Multi-line Title", () => {
  it("should display full title without truncation", () => {
    const longTitle = "This is a very long title that should wrap to multiple lines instead of being truncated with ellipsis";
    
    render(
      <DynamicTileContent
        data={{ title: longTitle }}
        scale={1}
        tileId="test-tile"
      />
    );
    
    const titleElement = screen.getByText(longTitle);
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveClass("break-words");
    expect(titleElement).not.toHaveClass("truncate");
  });
  
  it("should apply break-words class for all scales", () => {
    const scales = [1, 2, 3] as const;
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
      
      rerender(<div />); // Clean up between iterations
    });
  });
});