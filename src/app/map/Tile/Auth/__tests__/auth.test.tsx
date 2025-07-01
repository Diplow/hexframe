import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuthTile from "../auth";

// Mock the form components
vi.mock("~/components/auth/login-form", () => ({
  LoginForm: () => <div>Login Form</div>,
}));

vi.mock("~/components/auth/register-form", () => ({
  RegisterForm: () => <div>Register Form</div>,
}));

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

  it("toggle button is clickable", () => {
    render(<AuthTile />);
    
    // Initially shows login form
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    expect(screen.getByText("Login Form")).toBeInTheDocument();
    
    // Click toggle button
    const toggleButton = screen.getByRole("button", { name: /Need an account\? Register/i });
    fireEvent.click(toggleButton);
    
    // Should now show register form
    expect(screen.getByText("Create Account")).toBeInTheDocument();
    expect(screen.getByText("Register Form")).toBeInTheDocument();
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