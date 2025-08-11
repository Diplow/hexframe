'use client';

import { LogIn, UserPlus } from 'lucide-react';

interface FormHeaderProps {
  mode: 'login' | 'register';
  message?: string;
  isLoading: boolean;
  onModeToggle: () => void;
}

export function FormHeader({ mode, message, isLoading, onModeToggle }: FormHeaderProps) {
  return (
    <>
      {/* Register/Login toggle link */}
      <button
        onClick={onModeToggle}
        className="absolute top-4 right-4 text-sm text-secondary underline hover:text-secondary/80 transition-colors focus:outline-none rounded"
        disabled={isLoading}
        type="button"
      >
        {mode === 'login' ? 'Register' : 'Log in'}
      </button>

      <div className="flex items-center gap-2 mb-3">
        {mode === 'login' ? (
          <LogIn className="h-5 w-5 text-secondary-600" aria-hidden="true" />
        ) : (
          <UserPlus className="h-5 w-5 text-secondary-600" aria-hidden="true" />
        )}
        <h3 className="font-semibold text-secondary-900 dark:text-secondary-100">
          {mode === 'login' ? (
            <>Log in to <span className="font-light">Hex</span><span className="font-bold">Frame</span></>
          ) : (
            'Create an account'
          )}
        </h3>
      </div>

      {(mode === 'login' ? message : 'Join HexFrame to start creating your own systems.') && (
        <p className="text-sm text-secondary-700 dark:text-secondary-300 mb-4">
          {mode === 'login' ? message : (
            <>Join <span className="font-light">Hex</span><span className="font-bold">Frame</span> to start creating your own systems.</>
          )}
        </p>
      )}
    </>
  );
}