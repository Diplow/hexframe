'use client';

import { FormHeader } from './FormHeader';
import { FormFields } from './FormFields';
import { StatusMessages } from './StatusMessages';
import { FormActions } from './FormActions';
import { useLoginForm } from './useLoginForm';

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
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-secondary-50 dark:bg-secondary-900/20 rounded-lg p-4 border border-secondary-200 dark:border-secondary-800 relative">
        <FormHeader
          mode={mode}
          message={message}
          isLoading={isLoading}
          onModeToggle={() => setMode(mode === 'login' ? 'register' : 'login')}
        />

        <form onSubmit={handleSubmit} className="space-y-3">
          <FormFields
            mode={mode}
            username={username}
            email={email}
            password={password}
            isLoading={isLoading}
            onUsernameChange={setUsername}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
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