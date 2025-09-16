'use client';

import { Loader2 } from 'lucide-react';

interface FormActionsProps {
  mode: 'login' | 'register';
  isLoading: boolean;
  onCancel: () => void;
}

export function FormActions({ mode, isLoading, onCancel }: FormActionsProps) {
  return (
    <div className="flex gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={isLoading}
        aria-disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-secondary dark:text-secondary-foreground
                 bg-background dark:bg-neutral-700 border border-border
                 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-600
                 focus:outline-none focus:ring-2 focus:ring-secondary
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isLoading}
        aria-busy={isLoading}
        aria-disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md
                 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary
                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                 flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {isLoading
          ? (mode === 'login' ? 'Logging in...' : 'Creating account...')
          : (mode === 'login' ? 'Log in' : 'Register')
        }
      </button>
    </div>
  );
}