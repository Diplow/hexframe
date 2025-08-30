import '~/test/setup'; // Import test setup FIRST
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AuthTile from '~/app/map/Canvas/Tile/Auth/auth';

// No need to mock forms anymore as they're not used

// Mock the Canvas theme hook
vi.mock('~/app/map/Canvas', () => ({
  useCanvasTheme: () => ({ isDarkMode: false })
}));

describe('AuthTile', () => {
  it('renders with scale 3 hexagon', () => {
    const { container } = render(<AuthTile />);
    
    // Check that the tile wrapper exists with correct data-tile-id
    const tileWrapper = container.querySelector('[data-tile-id="auth"]');
    expect(tileWrapper).toBeTruthy();
    
    // Check that it has the correct dimensions for scale 3
    // For scale 3 with baseHexSize 50:
    // width = 50 * Math.sqrt(3) * Math.pow(3, 3-1) = 50 * 1.732 * 9 = ~779px
    // height = 50 * 2 * Math.pow(3, 3-1) = 100 * 9 = 900px
    const style = window.getComputedStyle(tileWrapper!);
    expect(style.width).toBe('779px');
    expect(style.height).toBe('900px');
  });
  
  it('renders authentication message', () => {
    render(<AuthTile />);
    
    // Check for auth content
    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(screen.getByText('Please use the chat interface to log in or sign up.')).toBeInTheDocument();
    expect(screen.getByText('The chat assistant will help you authenticate.')).toBeInTheDocument();
  });
  
  it('shows login message when initialView is login', () => {
    render(<AuthTile initialView="login" />);
    
    // Check for login-specific message
    expect(screen.getByText(/Open the chat panel and follow the prompts to log in/)).toBeInTheDocument();
  });
  
  it('shows register message when initialView is register', () => {
    render(<AuthTile initialView="register" />);
    
    // Check for register-specific message
    expect(screen.getByText(/Open the chat panel and follow the prompts to create an account/)).toBeInTheDocument();
  });
  
  it('has correct SVG structure for hexagon', () => {
    const { container } = render(<AuthTile />);
    
    // Check SVG exists
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    
    // Check SVG has correct viewBox
    expect(svg?.getAttribute('viewBox')).toBe('0 0 100 115.47');
    
    // Check path exists with correct d attribute
    const path = svg?.querySelector('path');
    expect(path).toBeTruthy();
    expect(path?.getAttribute('d')).toBe('M50 0 L100 28.87 L100 86.6 L50 115.47 L0 86.6 L0 28.87Z');
  });
  
  it('has correct pointer-events structure', () => {
    const { container } = render(<AuthTile />);
    
    // SVG should have pointer-events-none
    const svg = container.querySelector('svg');
    expect(svg?.classList.contains('pointer-events-none')).toBe(true);
    
    // Content div should have pointer-events-auto
    const contentDiv = container.querySelector('.pointer-events-auto');
    expect(contentDiv).toBeTruthy();
  });
});