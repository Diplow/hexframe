'use client';

import { X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface WidgetHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function WidgetHeader({
  icon,
  title,
  subtitle,
  onClose,
  actions,
  className,
}: WidgetHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3 p-3 border-b border-border', className)}>
      {icon && (
        <div className="flex-shrink-0">
          {icon}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground truncate">
            {subtitle}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {actions}
        </div>
      )}

      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 flex-shrink-0"
          onClick={onClose}
          aria-label="Close widget"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}