import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '~/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  helperText?: string;
}

/**
 * Shared Input component with consistent styling across all widgets
 * Supports icons, labels, and helper text
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, icon, helperText, id, ...props }, ref) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-2 top-2.5 text-secondary-400" aria-hidden="true">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full px-3 py-2 text-sm rounded-md',
              'border border-neutral-300 dark:border-neutral-700',
              'bg-background dark:bg-neutral-800',
              'text-secondary-900 dark:text-secondary-100',
              'placeholder-secondary-500',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors',
              icon && 'pl-8',
              className
            )}
            style={{
              WebkitBoxShadow: 'inset 0 0 0 1000px var(--background)',
              boxShadow: 'inset 0 0 0 1000px var(--background)',
              WebkitTextFillColor: 'var(--foreground)',
              color: 'var(--foreground)',
            }}
            {...props}
          />
        </div>
        {helperText && (
          <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
