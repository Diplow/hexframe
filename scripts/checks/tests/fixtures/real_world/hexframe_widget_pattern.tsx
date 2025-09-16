'use client';

import { useState } from 'react';
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
          <FormFields
            mode={mode}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            username={username}
            setUsername={setUsername}
          />

          <StatusMessages error={error} success={success} />

          <FormActions
            mode={mode}
            setMode={setMode}
            isLoading={isLoading}
            onCancel={handleCancel}
          />
        </form>
      </WidgetContent>
    </BaseWidget>
  );
}