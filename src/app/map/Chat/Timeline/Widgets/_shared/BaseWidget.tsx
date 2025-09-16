'use client';

import { cn } from '~/lib/utils';

interface BaseWidgetProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'destructive' | 'success' | 'info';
  className?: string;
  testId?: string;
  spacing?: 'default' | 'compact' | 'loose';
}

const variantStyles = {
  default: 'bg-neutral-200/50 border-transparent dark:bg-neutral-800/30',
  primary: 'bg-primary/8 border-transparent dark:bg-primary/12',
  destructive: 'bg-destructive/8 border-transparent dark:bg-destructive/12',
  success: 'bg-success/8 border-transparent dark:bg-success/12',
  info: 'bg-neutral-200/40 border-transparent dark:bg-neutral-600/40',
};

const spacingStyles = {
  default: 'my-2',
  compact: 'my-1',
  loose: 'my-4',
};

export function BaseWidget({
  children,
  variant = 'default',
  className,
  testId,
  spacing = 'default',
}: BaseWidgetProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex flex-col w-full rounded-lg border shadow-sm overflow-hidden',
        variantStyles[variant],
        spacingStyles[spacing],
        className
      )}
    >
      {children}
    </div>
  );
}