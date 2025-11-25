import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '~/lib/utils';
import { Loader2 } from 'lucide-react';

export interface FormButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md';
  isLoading?: boolean;
}

/**
 * Shared form button component with consistent styling across all widgets
 * Provides primary (submit), secondary (cancel), and destructive variants
 */
export const FormButton = forwardRef<HTMLButtonElement, FormButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = 'font-medium rounded-md focus:outline-none transition-colors inline-flex items-center justify-center gap-2';

    const sizeStyles = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-4 py-2 text-sm',
    };

    const variantStyles = {
      primary: cn(
        'text-white bg-primary',
        'hover:bg-primary/90',
        'focus:ring-2 focus:ring-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      ),
      secondary: cn(
        'text-secondary dark:text-secondary-foreground',
        'bg-background dark:bg-neutral-700',
        'border border-neutral-300 dark:border-neutral-700',
        'hover:bg-neutral-100 dark:hover:bg-neutral-600',
        'focus:ring-2 focus:ring-secondary focus:border-secondary',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      ),
      destructive: cn(
        'text-white bg-destructive',
        'hover:bg-destructive/90',
        'focus:ring-2 focus:ring-destructive',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      ),
    };

    return (
      <button
        ref={ref}
        disabled={(disabled ?? false) || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

FormButton.displayName = 'FormButton';
