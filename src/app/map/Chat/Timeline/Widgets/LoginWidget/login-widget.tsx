'use client';

import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { FormFields } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/FormFields';
import { StatusMessages } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/StatusMessages';
import { FormActions } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/FormActions';
import { useLoginForm } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/useLoginForm';
import { BaseWidget, WidgetHeader, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface LoginWidgetProps {
  message?: string;
  onClose?: () => void;
}

export function LoginWidget({ message, onClose }: LoginWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    username,
    setUsername,
    error,
    success,
    isLoading,
    handleSubmit,
    handleCancel,
  } = useLoginForm();

  // Log when component mounts/unmounts
  useEffect(() => {
    console.log('[LoginWidget] Component mounted', { message, hasOnClose: !!onClose });
    return () => {
      console.log('[LoginWidget] Component unmounting');
    };
  }, [message, onClose]);

  // Log state changes
  useEffect(() => {
    console.log('[LoginWidget] State changed', {
      mode,
      hasError: !!error,
      hasSuccess: !!success,
      isLoading,
      isCollapsed,
      email: email ? '(set)' : '(empty)',
      password: password ? '(set)' : '(empty)'
    });
  }, [mode, error, success, isLoading, isCollapsed, email, password]);

  return (
    <BaseWidget className="w-full">
      <WidgetHeader
        icon={<User className="h-5 w-5 text-primary" />}
        title={mode === 'login' ? 'Sign In' : 'Create Account'}
        subtitle={message}
        onClose={onClose}
        collapsible={true}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <WidgetContent isCollapsed={isCollapsed}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm text-primary hover:underline"
              disabled={isLoading}
            >
              {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
            </button>
          </div>

          <FormFields
            mode={mode}
            values={{ username, email, password }}
            isLoading={isLoading}
            onChange={{
              username: setUsername,
              email: setEmail,
              password: setPassword,
            }}
          />

          <StatusMessages error={error} success={success} />

          <div className="flex justify-end">
            <FormActions
              mode={mode}
              isLoading={isLoading}
              onCancel={() => {
                handleCancel();
                onClose?.();
              }}
            />
          </div>
        </form>
      </WidgetContent>
    </BaseWidget>
  );
}