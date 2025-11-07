'use client';

import { FormButton } from '~/app/components';

interface FormActionsProps {
  mode: 'login' | 'register';
  isLoading: boolean;
  onCancel: () => void;
}

export function FormActions({ mode, isLoading, onCancel }: FormActionsProps) {
  return (
    <div className="flex gap-2 pt-2">
      <FormButton
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={isLoading}
      >
        Cancel
      </FormButton>
      <FormButton
        type="submit"
        variant="primary"
        isLoading={isLoading}
        disabled={isLoading}
      >
        {isLoading
          ? (mode === 'login' ? 'Logging in...' : 'Creating account...')
          : (mode === 'login' ? 'Log in' : 'Register')
        }
      </FormButton>
    </div>
  );
}
