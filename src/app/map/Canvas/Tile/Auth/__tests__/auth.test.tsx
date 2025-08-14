import '~/test/setup'; // Import test setup FIRST
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthTile from "../auth";

// No need to mock forms anymore as they're not used

// Mock the Canvas theme hook
vi.mock("~/app/map/Canvas", () => ({
  useCanvasTheme: () => ({ isDarkMode: false })
}));

describe("AuthTile", () => {
  it("renders with scale 3 hexagon shape", () => {
    const { container } = render(<AuthTile />);
    
    // Check that the tile container has the correct dimensions for scale 3
    const tileContainer = container.querySelector('[data-tile-id="auth"]');
    expect(tileContainer).toBeTruthy();
    
    // Scale 3 with baseHexSize 50 should result in:
    // width = 50 * sqrt(3) * 3^(3-1) = 50 * 1.732 * 9 = 779px
    // height = 50 * 2 * 3^(3-1) = 100 * 9 = 900px
    const styles = window.getComputedStyle(tileContainer!);
    expect(styles.width).toBe("779px");
    expect(styles.height).toBe("900px");
  });

  it("renders hexagon SVG path correctly", () => {
    const { container } = render(<AuthTile />);
    
    // Check SVG structure
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 100 115.47");
    
    // Check hexagon path
    const path = svg?.querySelector("path");
    expect(path).toBeTruthy();
    expect(path?.getAttribute("d")).toBe("M50 0 L100 28.87 L100 86.6 L50 115.47 L0 86.6 L0 28.87Z");
  });

  it("shows authentication instructions", () => {
    render(<AuthTile />);
    
    // Should show authentication instructions
    expect(screen.getByText("Authentication")).toBeInTheDocument();
    expect(screen.getByText("Please use the chat interface to log in or sign up.")).toBeInTheDocument();
    expect(screen.getByText("The chat assistant will help you authenticate.")).toBeInTheDocument();
  });

  it("content has proper pointer events", () => {
    const { container } = render(<AuthTile />);
    
    // SVG should have pointer-events-none
    const svg = container.querySelector("svg");
    expect(svg?.classList.contains("pointer-events-none")).toBe(true);
    
    // Content container should have pointer-events-auto
    const contentDiv = container.querySelector(".pointer-events-auto");
    expect(contentDiv).toBeTruthy();
  });
});