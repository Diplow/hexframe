'use client';

import { UsernameField } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/_components/UsernameField';
import { EmailField } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/_components/EmailField';
import { PasswordFieldInput } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/_components/PasswordFieldInput';

interface FormFieldsProps {
  mode: 'login' | 'register';
  values: {
    username: string;
    email: string;
    password: string;
  };
  isLoading: boolean;
  onChange: {
    username: (username: string) => void;
    email: (email: string) => void;
    password: (password: string) => void;
  };
}

export function FormFields({
  mode,
  values,
  isLoading,
  onChange,
}: FormFieldsProps) {
  return (
    <>
      {mode === 'register' && (
        <UsernameField
          value={values.username}
          onChange={onChange.username}
          isLoading={isLoading}
        />
      )}

      <EmailField
        value={values.email}
        onChange={onChange.email}
        isLoading={isLoading}
        autoFocus={mode === 'login'}
      />

      <PasswordFieldInput
        value={values.password}
        onChange={onChange.password}
        isLoading={isLoading}
        mode={mode}
      />
    </>
  );
}
