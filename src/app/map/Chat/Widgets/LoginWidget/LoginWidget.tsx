import React, { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import type { LoginWidgetProps } from '../_base/widget.types';
import { WidgetContainer } from '../_base/WidgetContainer';

/**
 * LoginWidget - Handles authentication flows
 * This is NOT a Canvas widget - it doesn't modify the map
 */
export function LoginWidget({
  id,
  message = 'Please log in to continue',
  onAuthenticate,
  onCancel,
  onClose,
  authState = 'unauthenticated',
  isExpanded,
  isLoading = authState === 'authenticating',
  error,
  timestamp,
  priority = 'action',
}: LoginWidgetProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleLogin = async () => {
    try {
      await onAuthenticate();
    } catch (err) {
      // Error will be handled by parent component
      console.error('Authentication failed:', err);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onClose?.();
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
  };

  return (
    <WidgetContainer
      id={id}
      onClose={onClose}
      isExpanded={isExpanded}
      isLoading={isLoading}
      error={error}
      timestamp={timestamp}
      priority={priority}
      isCanvasOperation={false}
      className="login-widget"
    >
      <div className="space-y-4 relative">
        {/* Register/Login toggle link */}
        <button
          onClick={toggleMode}
          className="absolute top-0 right-0 text-sm text-primary underline hover:text-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          disabled={isLoading}
        >
          {mode === 'login' ? 'Register' : 'Log in'}
        </button>

        {/* Icon and message */}
        <div className="text-center pt-6">
          {mode === 'login' ? (
            <LogIn className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          ) : (
            <UserPlus className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-sm text-foreground">
            {mode === 'login' ? message : 'Create a new account to get started'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-2">
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            variant="default"
            size="sm"
          >
            {mode === 'login' ? 'Log in' : 'Register'}
          </Button>
          {onCancel && (
            <Button
              onClick={handleCancel}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </WidgetContainer>
  );
}