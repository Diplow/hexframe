import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginWidget } from '../LoginWidget';

describe('LoginWidget', () => {
  const defaultProps = {
    id: 'login-1',
    onAuthenticate: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders in login mode by default', () => {
    render(<LoginWidget {...defaultProps} />);
    
    expect(screen.getByText('Please log in to continue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
  });

  it('switches to register mode when Register link is clicked', () => {
    render(<LoginWidget {...defaultProps} />);
    
    const registerLink = screen.getByRole('button', { name: 'Register' });
    fireEvent.click(registerLink);
    
    expect(screen.getByText('Create a new account to get started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('switches back to login mode when Log in link is clicked', () => {
    render(<LoginWidget {...defaultProps} />);
    
    // Switch to register mode
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    
    // Switch back to login mode
    const loginLink = screen.getByRole('button', { name: 'Log in' });
    fireEvent.click(loginLink);
    
    expect(screen.getByText('Please log in to continue')).toBeInTheDocument();
  });

  it('disables mode toggle when loading', () => {
    render(<LoginWidget {...defaultProps} authState="authenticating" />);
    
    const toggleButton = screen.getByRole('button', { name: 'Register' });
    expect(toggleButton).toBeDisabled();
  });

  it('calls onAuthenticate when action button is clicked in either mode', async () => {
    const onAuthenticate = vi.fn();
    render(<LoginWidget {...defaultProps} onAuthenticate={onAuthenticate} />);
    
    // Test in login mode
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(onAuthenticate).toHaveBeenCalledTimes(1);
    
    // Switch to register mode and test
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(onAuthenticate).toHaveBeenCalledTimes(2);
  });
});