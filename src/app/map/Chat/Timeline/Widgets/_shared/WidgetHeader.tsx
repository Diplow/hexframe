'use client';

import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { HexagonIcon } from '~/app/map/Chat/Timeline/Widgets/_shared/HexagonIcon';

interface WidgetHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  actions?: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function WidgetHeader({
  icon,
  title,
  subtitle,
  onClose,
  actions,
  className,
  collapsible = false,
  isCollapsed = false,
  onToggleCollapse,
}: WidgetHeaderProps) {
  const headerContent = (
    <>
      {collapsible && (
        <div className="flex-shrink-0">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      )}

      {icon ? (
        <div className="flex-shrink-0">
          {icon}
        </div>
      ) : (
        <div className="flex-shrink-0">
          <HexagonIcon className="h-4 w-4 text-muted-foreground" />
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
    </>
  );

  if (collapsible && onToggleCollapse) {
    return (
      <button
        onClick={onToggleCollapse}
        className={cn(
          'flex items-center gap-3 p-3 border-b border-border w-full text-left hover:bg-muted/50 transition-colors',
          className
        )}
      >
        {headerContent}
      </button>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 p-3 border-b border-border', className)}>
      {headerContent}
    </div>
  );
}