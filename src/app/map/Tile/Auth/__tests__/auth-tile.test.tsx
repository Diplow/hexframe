import '~/test/setup'; // Import test setup FIRST
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AuthTile from '../auth';

// Mock the LoginForm and RegisterForm components
vi.mock('~/components/auth/login-form', () => ({
  LoginForm: () => <div data-testid="login-form">Login Form</div>
}));

vi.mock('~/components/auth/register-form', () => ({
  RegisterForm: () => <div data-testid="register-form">Register Form</div>
}));

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
  
  it('renders login form by default', () => {
    render(<AuthTile />);
    
    // Check for login-specific content
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Please login to continue.')).toBeInTheDocument();
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });
  
  it('renders register form when initialView is register', () => {
    render(<AuthTile initialView="register" />);
    
    // Check for register-specific content
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText('Sign up to get started.')).toBeInTheDocument();
    expect(screen.getByTestId('register-form')).toBeInTheDocument();
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