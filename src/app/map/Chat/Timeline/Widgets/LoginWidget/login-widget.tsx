'use client';

import { FormHeader } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/FormHeader';
import { FormFields } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/FormFields';
import { StatusMessages } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/StatusMessages';
import { FormActions } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/FormActions';
import { useLoginForm } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/useLoginForm';
import { BaseWidget, WidgetContent } from '~/app/map/Chat/Timeline/Widgets/_shared';

interface LoginWidgetProps {
  message?: string;
}

export function LoginWidget({ message }: LoginWidgetProps) {
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
    <BaseWidget variant="info" className="w-full max-w-sm mx-auto">
      <WidgetContent>
        <FormHeader
          mode={mode}
          message={message}
          isLoading={isLoading}
          onModeToggle={() => setMode(mode === 'login' ? 'register' : 'login')}
        />

        <form onSubmit={handleSubmit} className="space-y-3">
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

          <FormActions
            mode={mode}
            isLoading={isLoading}
            onCancel={handleCancel}
          />
        </form>
      </WidgetContent>
    </BaseWidget>
  );
}