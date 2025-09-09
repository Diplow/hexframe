'use client';

import { FormHeader } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/FormHeader';
import { FormFields } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/FormFields';
import { StatusMessages } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/StatusMessages';
import { FormActions } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/FormActions';
import { useLoginForm } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/useLoginForm';

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
    <div className="w-full">
      <div className="bg-neutral-50 dark:bg-neutral-800/30 rounded-lg p-4 border-transparent relative">
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
      </div>
    </div>
  );
}