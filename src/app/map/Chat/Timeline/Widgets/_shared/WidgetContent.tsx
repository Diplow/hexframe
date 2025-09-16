'use client';

import { cn } from '~/lib/utils';

interface WidgetContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  actions?: React.ReactNode;
}

const paddingStyles = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

export function WidgetContent({
  children,
  className,
  padding = 'md',
  actions,
}: WidgetContentProps) {
  return (
    <div className={cn('flex-1', paddingStyles[padding], className)}>
      <div className="space-y-4">
        {children}
      </div>
      {actions && (
        <div className="mt-4 pt-4 border-t border-border">
          {actions}
        </div>
      )}
    </div>
  );
}