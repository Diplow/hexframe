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
  default: 'bg-card border-transparent',
  primary: 'bg-primary/5 border-transparent dark:bg-primary/10',
  destructive: 'bg-destructive/5 border-transparent dark:bg-destructive/10',
  success: 'bg-success/5 border-transparent dark:bg-success/10',
  info: 'bg-secondary/5 border-transparent dark:bg-secondary/10',
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