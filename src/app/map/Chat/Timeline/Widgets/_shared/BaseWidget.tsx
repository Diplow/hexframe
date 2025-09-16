'use client';

import { cn } from '~/lib/utils';

interface BaseWidgetProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'destructive' | 'success' | 'info';
  className?: string;
  testId?: string;
}

const variantStyles = {
  default: 'bg-card border-border',
  primary: 'bg-primary/5 border-primary/20 dark:bg-primary/10',
  destructive: 'bg-destructive/5 border-destructive/20 dark:bg-destructive/10',
  success: 'bg-success/5 border-success/20 dark:bg-success/10',
  info: 'bg-secondary/5 border-secondary/20 dark:bg-secondary/10',
};

export function BaseWidget({
  children,
  variant = 'default',
  className,
  testId,
}: BaseWidgetProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex flex-col w-full rounded-lg border shadow-sm overflow-hidden',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
}